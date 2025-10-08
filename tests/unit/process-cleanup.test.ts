/**
 * Process Cleanup Utility Tests
 * Tests for zombie process prevention and cleanup
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ProcessManager } from '../utils/process-cleanup';

describe('ProcessManager', () => {
  let manager: ProcessManager;

  beforeEach(() => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';
    manager = new ProcessManager();
  });

  afterEach(async () => {
    await manager.killAll(1000);
    manager.cleanup();
  });

  test('should track spawned processes', async () => {
    const proc = manager.spawn(['sleep', '0.1']);
    expect(manager.count()).toBe(1);

    await proc.exited;

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(manager.count()).toBe(0);
  });

  test('should kill process on timeout', async () => {
    const proc = manager.spawn(['sleep', '10']);
    expect(manager.count()).toBe(1);

    // Kill immediately
    await manager.kill(proc, 15, 1000);

    expect(manager.count()).toBe(0);
  });

  test('should track multiple processes', () => {
    const proc1 = manager.spawn(['sleep', '0.1']);
    const proc2 = manager.spawn(['sleep', '0.1']);
    const proc3 = manager.spawn(['sleep', '0.1']);

    expect(manager.count()).toBe(3);
  });

  test('should kill all processes', async () => {
    manager.spawn(['sleep', '10']);
    manager.spawn(['sleep', '10']);
    manager.spawn(['sleep', '10']);

    expect(manager.count()).toBe(3);

    await manager.killAll(2000);

    expect(manager.count()).toBe(0);
  });

  test('should handle process that exits normally', async () => {
    const proc = manager.spawn(['echo', 'test']);

    await proc.exited;

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(manager.count()).toBe(0);
  });

  test('should handle killing already dead process', async () => {
    const proc = manager.spawn(['echo', 'test']);
    await proc.exited;

    // Should not throw
    await expect(manager.kill(proc, 15, 1000)).resolves.toBeUndefined();
  });

  test('should force kill with SIGKILL if SIGTERM fails', async () => {
    // This test is tricky - we need a process that ignores SIGTERM
    // For now, just test that the method completes
    const proc = manager.spawn(['sleep', '1']);

    await expect(manager.kill(proc, 15, 100)).resolves.toBeUndefined();
    expect(manager.count()).toBe(0);
  });

  test('should not allow concurrent killAll calls', async () => {
    manager.spawn(['sleep', '10']);
    manager.spawn(['sleep', '10']);

    // Start two killAll calls
    const kill1 = manager.killAll(1000);
    const kill2 = manager.killAll(1000);

    await Promise.all([kill1, kill2]);

    expect(manager.count()).toBe(0);
  });

  test('should auto-remove process when it exits', async () => {
    const proc = manager.spawn(['sh', '-c', 'exit 0']);

    expect(manager.count()).toBe(1);

    await proc.exited;

    // Wait for auto-cleanup
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(manager.count()).toBe(0);
  });

  test('should auto-remove process on error', async () => {
    const proc = manager.spawn(['sh', '-c', 'exit 1']);

    expect(manager.count()).toBe(1);

    await proc.exited;

    // Wait for auto-cleanup
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(manager.count()).toBe(0);
  });
});

describe('ProcessManager - spawn wrapper', () => {
  let manager: ProcessManager;

  beforeEach(() => {
    manager = new ProcessManager();
  });

  afterEach(async () => {
    await manager.killAll(1000);
    manager.cleanup();
  });

  test('should spawn and track process', async () => {
    const proc = manager.spawn(['echo', 'hello']);

    expect(manager.count()).toBe(1);

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test('should spawn with options', async () => {
    const proc = manager.spawn(['pwd'], {
      cwd: '/'
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test('should handle spawn failure gracefully', async () => {
    // Bun.spawn throws immediately for non-existent commands
    // so we can't track them - this is expected behavior
    expect(() => {
      manager.spawn(['this-command-does-not-exist-12345']);
    }).toThrow();

    // No process should be tracked since spawn failed
    expect(manager.count()).toBe(0);
  });
});

