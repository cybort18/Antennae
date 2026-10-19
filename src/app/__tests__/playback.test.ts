/**
 * Playback math and formatting tests.
 *
 * The cursor must stay inside the recorded samples, clamp at both ends, and be
 * immune to hostile inputs (NaN, negative deltas, missing samples).
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_TIME_SCALE, TIME_SCALE_OPTIONS, advanceProgressSeconds, indexForTime } from '../playback';
import {
  UNAVAILABLE,
  formatClock,
  formatInteger,
  formatNumber,
  formatPercent,
} from '../../results/format';

describe('advanceProgressSeconds', () => {
  it('advances by time scale times real time', () => {
    expect(advanceProgressSeconds(0, 1, 300, 10_000)).toBe(300);
    expect(advanceProgressSeconds(100, 0.5, 60, 10_000)).toBe(130);
  });

  it('clamps at zero and at the last recorded time', () => {
    expect(advanceProgressSeconds(9_900, 1, 300, 10_000)).toBe(10_000);
    expect(advanceProgressSeconds(0, -5, 300, 10_000)).toBe(0);
  });

  it('ignores non-finite input instead of producing NaN', () => {
    expect(advanceProgressSeconds(500, Number.NaN, 300, 10_000)).toBe(500);
    expect(advanceProgressSeconds(Number.NaN, 1, 300, 10_000)).toBe(300);
    expect(advanceProgressSeconds(500, Number.POSITIVE_INFINITY, 300, 10_000)).toBe(500);
  });
});

describe('indexForTime', () => {
  it('snaps to the nearest recorded sample', () => {
    expect(indexForTime(0, 10, 101, 1000)).toBe(0);
    expect(indexForTime(10, 10, 101, 1000)).toBe(1);
    expect(indexForTime(24, 10, 101, 1000)).toBe(2);
    expect(indexForTime(25, 10, 101, 1000)).toBe(3);
  });

  it('never exceeds the available samples', () => {
    expect(indexForTime(1000, 10, 101, 1000)).toBe(100);
    expect(indexForTime(50, 10, 6, 50)).toBe(5);
    expect(indexForTime(10, 10, 0, 10)).toBe(0);
  });

  it('snaps to the final sample when a run stopped off the sampling grid', () => {
    // Samples at 0,50,...,300 plus an off-grid stop at 320 would be 8 samples.
    expect(indexForTime(320, 50, 8, 320)).toBe(7);
  });

  it('is defensive about a broken sample interval', () => {
    expect(indexForTime(500, 0, 101, 1000)).toBe(0);
    expect(indexForTime(500, Number.NaN, 101, 1000)).toBe(0);
  });
});

describe('time scale options', () => {
  it('are finite, positive, strictly ascending, and include the default', () => {
    for (const option of TIME_SCALE_OPTIONS) {
      expect(Number.isFinite(option)).toBe(true);
      expect(option).toBeGreaterThan(0);
    }
    const sorted = [...TIME_SCALE_OPTIONS].sort((a, b) => a - b);
    expect([...TIME_SCALE_OPTIONS]).toEqual(sorted);
    expect(TIME_SCALE_OPTIONS).toContain(DEFAULT_TIME_SCALE);
  });
});

describe('formatting', () => {
  it('marks non-finite values as unavailable rather than showing a number', () => {
    expect(formatNumber(Number.NaN)).toBe(UNAVAILABLE);
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe(UNAVAILABLE);
    expect(formatPercent(Number.NaN)).toBe(UNAVAILABLE);
    expect(formatClock(Number.NaN)).toBe(UNAVAILABLE);
    expect(formatInteger(Number.NaN)).toBe(UNAVAILABLE);
  });

  it('formats values with the requested precision', () => {
    expect(formatNumber(7.67264, 4)).toBe('7.6726');
    expect(formatPercent(0.00001234, 4)).toBe('0.0012%');
    expect(formatClock(3725)).toBe('01:02:05');
    expect(formatClock(0)).toBe('00:00:00');
    expect(formatInteger(1664)).toBe('1,664');
  });
});
