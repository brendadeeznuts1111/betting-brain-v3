/**
 * Cloudflare passes the exact configured cron string as event.cron, and
 * src/index.ts dispatches on string equality — a schedule that is handled in
 * code but missing from a wrangler config never runs in that environment.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dir, '..', '..');
const crons = (file: string, path: string[]): string[] => {
  let node: any = Bun.TOML.parse(readFileSync(join(root, file), 'utf8'));
  for (const k of path) node = node?.[k];
  return node?.crons ?? [];
};

describe('wrangler cron triggers', () => {
  const configs: Array<[string, string[]]> = [
    ['wrangler.toml', ['triggers']],
    ['wrangler.staging.toml', ['env', 'staging', 'triggers']],
    ['wrangler.production.toml', ['env', 'production', 'triggers']],
  ];

  test.each(configs)('%s registers the */5 bet-history ingest trigger', (file, path) => {
    expect(crons(file, path)).toContain('*/5 * * * *');
  });

  test('src/index.ts dispatches */5 to the bet-history ingest', () => {
    const src = readFileSync(join(root, 'src', 'index.ts'), 'utf8');
    expect(src).toMatch(/cron === '\*\/5 \* \* \* \*'\)[\s\S]{0,300}handleBetHistoryIngest/);
  });
});
