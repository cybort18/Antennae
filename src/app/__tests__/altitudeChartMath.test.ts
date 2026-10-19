/**
 * Chart scale and tick math tests.
 *
 * The chart must map physical kilometres and seconds onto the view box in one
 * predictable place; these tests pin that mapping so a rendering change cannot
 * quietly distort the comparison.
 */
import { describe, expect, it } from 'vitest';

import type { AltitudeSeries } from '../../comparison/compareRuns';
import {
  altitudeDomain,
  chartLayout,
  createAltitudeScale,
  createLinearScale,
  formatTickValue,
  niceTicks,
  roundCoordinate,
  timeDomain,
} from '../altitudeChartMath';

function seriesWith(points: Array<[number, number]>, role: AltitudeSeries['role'] = 'baseline'): AltitudeSeries {
  const mapped = points.map(([timeSeconds, altitudeKm]) => ({ timeSeconds, altitudeKm }));
  return {
    role,
    points: mapped,
    lastRecordedTimeSeconds: mapped[mapped.length - 1]?.timeSeconds ?? 0,
    requestedDurationSeconds: mapped[mapped.length - 1]?.timeSeconds ?? 0,
    status: 'completed',
    stopReason: null,
    endedEarly: false,
  };
}

describe('chartLayout', () => {
  it('reserves margins and derives the plot rectangle', () => {
    const layout = chartLayout(760, 200);

    expect(layout.plot.left).toBe(72);
    expect(layout.plot.right).toBe(736);
    expect(layout.plot.top).toBe(16);
    expect(layout.plot.bottom).toBe(156);
    expect(layout.plot.width).toBe(664);
    expect(layout.plot.height).toBe(140);
  });
});

describe('createLinearScale', () => {
  it('maps domain ends onto range ends', () => {
    const scale = createLinearScale({ min: 0, max: 100 }, { start: 10, end: 110 });

    expect(scale.map(0)).toBe(10);
    expect(scale.map(100)).toBe(110);
    expect(scale.map(50)).toBe(60);
  });

  it('maps a degenerate domain to the middle instead of dividing by zero', () => {
    const scale = createLinearScale({ min: 7, max: 7 }, { start: 0, end: 100 });

    expect(scale.map(7)).toBe(50);
    expect(Number.isFinite(scale.map(7))).toBe(true);
  });
});

describe('domains', () => {
  it('start time at zero and end at the longest recorded time', () => {
    const domain = timeDomain([
      seriesWith([[0, 400], [100, 400]]),
      seriesWith([[0, 900], [250, 900]], 'candidate'),
    ]);

    expect(domain).toEqual({ min: 0, max: 250 });
  });

  it('never produce a zero-span time domain', () => {
    expect(timeDomain([])).toEqual({ min: 0, max: 1 });
  });

  it('pad the altitude range and keep a usable span for a flat series', () => {
    const circular = seriesWith([[0, 400], [100, 400]]);
    const padded = altitudeDomain([circular], 0.08);

    expect(padded.min).toBeLessThan(400);
    expect(padded.max).toBeGreaterThan(400);
    expect(padded.max - padded.min).toBeGreaterThan(1);
  });

  it('cover the extreme altitudes of all series', () => {
    const domain = altitudeDomain([
      seriesWith([[0, 400], [100, 420]]),
      seriesWith([[0, 900], [100, 1200]], 'candidate'),
    ]);

    expect(domain.min).toBeLessThanOrEqual(400);
    expect(domain.max).toBeGreaterThanOrEqual(1200);
  });
});

describe('createAltitudeScale', () => {
  it('inverts altitude so a higher orbit is drawn higher on screen', () => {
    const layout = chartLayout(760, 200);
    const scale = createAltitudeScale({ min: 400, max: 900 }, layout);

    expect(scale.map(400)).toBeCloseTo(layout.plot.bottom, 9);
    expect(scale.map(900)).toBeCloseTo(layout.plot.top, 9);
    expect(scale.map(900)).toBeLessThan(scale.map(400));
    // A 500 km difference on a 500 km domain spans the whole plot height.
    expect(scale.map(400) - scale.map(900)).toBeCloseTo(layout.plot.height, 9);
  });
});

describe('niceTicks', () => {
  it('uses 1/2/5 step sizes inside the domain', () => {
    expect(niceTicks({ min: 0, max: 100 }, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks({ min: 0, max: 16630 }, 6)).toEqual([0, 5000, 10000, 15000]);
  });

  it('returns a single tick for a degenerate domain', () => {
    expect(niceTicks({ min: 5, max: 5 })).toEqual([5]);
  });
});

describe('formatting', () => {
  it('groups thousands and keeps small values readable', () => {
    expect(formatTickValue(16000)).toBe('16,000');
    expect(formatTickValue(400)).toBe('400');
    expect(formatTickValue(0.5)).toBe('0.5');
  });

  it('rounds view coordinates to two decimals', () => {
    expect(roundCoordinate(742.0000001)).toBe(742);
    expect(roundCoordinate(12.3456)).toBe(12.35);
  });
});
