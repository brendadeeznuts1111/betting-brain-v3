/**
 * Process Cleanup Utility
 * Tracks and cleans up all spawned child processes to prevent zombies
 * 
 * Features:
 * - Automatic cleanup on process exit
 * - Signal handling (SIGINT, SIGTERM, SIGHUP)
 * - Process group management
 * - Timeout enforcement
 */

import type { Subprocess } from 'bun';

class ProcessManager {
  private processes: Set<Subprocess> = new Set();
  private signalHandlers: Map<string, () => void> = new Map();
  private cleanupInProgress = false;

  constructor() {
    this.setupSignalHandlers();
  }

  /**
   * Track a spawned process for automatic cleanup
   */
  track(process: Subprocess): Subprocess {
    this.processes.add(process);
    
    // Auto-remove when process exits
    process.exited.then(() => {
      this.processes.delete(process);
    }).catch(() => {
      this.processes.delete(process);
    });

    return process;
  }

  /**
   * Spawn and track a process
   */
  spawn(command: string[], options?: any): Subprocess {
    const process = Bun.spawn(command, options);
    return this.track(process);
  }

  /**
   * Kill a specific process with timeout
   */
  async kill(process: Subprocess, signal: number = 15, timeoutMs: number = 5000): Promise<void> {
    try {
      // Try SIGTERM first
      process.kill(signal);
      
      // Wait for process to exit
      const exitPromise = process.exited;
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Kill timeout')), timeoutMs)
      );

      await Promise.race([exitPromise, timeoutPromise]);
    } catch (error) {
      // Force kill with SIGKILL if SIGTERM fails
      try {
        process.kill(9);
        await Promise.race([
          process.exited,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Force kill timeout')), 1000))
        ]);
      } catch {
        // Process may already be dead, ignore
      }
    } finally {
      this.processes.delete(process);
    }
  }

  /**
   * Kill all tracked processes
   */
  async killAll(timeoutMs: number = 5000): Promise<void> {
    if (this.cleanupInProgress) return;
    this.cleanupInProgress = true;

    const processes = Array.from(this.processes);
    if (processes.length === 0) {
      this.cleanupInProgress = false;
      return;
    }

    console.log(`🧹 Cleaning up ${processes.length} child process(es)...`);

    // Kill all processes in parallel
    await Promise.allSettled(
      processes.map(proc => this.kill(proc, 15, timeoutMs))
    );

    this.processes.clear();
    this.cleanupInProgress = false;
  }

  /**
   * Get count of active processes
   */
  count(): number {
    return this.processes.size;
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

    for (const signal of signals) {
      const handler = () => {
        console.log(`\n⚠️  Received ${signal}, cleaning up...`);
        this.killAll(3000).then(() => {
          console.log('✅ Cleanup complete');
          process.exit(0);
        }).catch((error) => {
          console.error('❌ Cleanup failed:', error);
          process.exit(1);
        });
      };

      this.signalHandlers.set(signal, handler);
      process.on(signal, handler);
    }

    // Cleanup on normal exit
    process.on('beforeExit', () => {
      if (!this.cleanupInProgress && this.processes.size > 0) {
        console.log('⚠️  Processes still running, cleaning up...');
        this.killAll(2000);
      }
    });
  }

  /**
   * Remove signal handlers (for testing)
   */
  cleanup(): void {
    for (const [signal, handler] of this.signalHandlers.entries()) {
      process.off(signal as NodeJS.Signals, handler);
    }
    this.signalHandlers.clear();
  }
}

// Global singleton instance
const processManager = new ProcessManager();

export { processManager, ProcessManager };
export default processManager;

