/**
 * fantasy402 timestamps are US-Eastern wall-clock with no zone. They must be
 * converted to real UTC (DST-aware), not labelled UTC with a bare 'Z'.
 */
import { describe, expect, test } from 'bun:test';
import { formatEasternDate, parseF402Timestamp } from '../../src/schedules/betHistoryIngest';

describe('parseF402Timestamp (Eastern -> UTC)', () => {
  test.each([
    // standard time, UTC-5
    ['2026-01-15 12:00:00.000', '2026-01-15T17:00:00.000Z'],
    ['2026-12-31 23:59:59.999', '2027-01-01T04:59:59.999Z'], // crosses UTC year
    // daylight time, UTC-4
    ['2026-07-15 12:00:00.000', '2026-07-15T16:00:00.000Z'],
    ['2026-10-20 22:15:00', '2026-10-21T02:15:00.000Z'], // crosses UTC date
    // spring forward 2026-03-08 02:00 EST -> 03:00 EDT
    ['2026-03-08 01:59:59', '2026-03-08T06:59:59.000Z'],
    ['2026-03-08 03:00:00', '2026-03-08T07:00:00.000Z'],
    ['2026-03-08 02:30:00', '2026-03-08T07:30:00.000Z'], // gap time resolves forward
    // fall back 2026-11-01 02:00 EDT -> 01:00 EST
    ['2026-11-01 00:30:00', '2026-11-01T04:30:00.000Z'],
    ['2026-11-01 01:30:00', '2026-11-01T05:30:00.000Z'], // ambiguous -> first (EDT)
    ['2026-11-01 02:30:00', '2026-11-01T07:30:00.000Z'],
    // zoneless ISO-T form is also Eastern
    ['2026-07-15T12:00:00', '2026-07-15T16:00:00.000Z'],
    // explicit zone is trusted
    ['2026-07-15T12:00:00Z', '2026-07-15T12:00:00.000Z'],
    ['2026-07-15T12:00:00-04:00', '2026-07-15T16:00:00.000Z'],
  ])('%s -> %s', (raw, expected) => {
    expect(parseF402Timestamp(raw)).toBe(expected);
  });

  test('regression: a timestamp is never just the wall clock with Z appended', () => {
    expect(parseF402Timestamp('2026-10-20 12:00:00.000')).not.toBe('2026-10-20T12:00:00.000Z');
  });

  test('empty or unparseable input falls back to now', () => {
    for (const raw of ['', '   ', 'not a date']) {
      const t = Date.parse(parseF402Timestamp(raw));
      expect(Math.abs(t - Date.now())).toBeLessThan(5_000);
    }
  });
});

describe('formatEasternDate (report date params)', () => {
  test('uses the Eastern calendar date, not the UTC one', () => {
    expect(formatEasternDate(new Date('2026-10-21T02:00:00Z'))).toBe('10/20/2026');
    expect(formatEasternDate(new Date('2026-10-21T05:00:00Z'))).toBe('10/21/2026');
    expect(formatEasternDate(new Date('2026-01-01T04:59:59Z'))).toBe('12/31/2025');
  });
});
