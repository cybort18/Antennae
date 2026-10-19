/**
 * Pure scale and tick math for the altitude-versus-time chart.
 *
 * Kept separate from the SVG component so the geometry can be unit-tested with
 * plain numbers and so the chart has exactly one place where physical values are
 * mapped to view coordinates.
 */

import type { AltitudeSeries } from '../comparison/compareRuns';

export type Domain = { min: number; max: number };

export type LinearScale = {
  domain: Domain;
  range: { start: number; end: number };
  /** Maps a physical value into view coordinates. */
  map: (value: number) => number;
};

export type ChartLayout = {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  plot: { left: number; right: number; top: number; bottom: number; width: number; height: number };
};

/** Layout used by the SVG chart. Exported so tests can reproduce the geometry. */
export function chartLayout(width = 760, height = 200): ChartLayout {
  const margin = { top: 16, right: 24, bottom: 44, left: 72 };
  const plot = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  return { width, height, margin, plot };
}

export function timeDomain(series: AltitudeSeries[]): Domain {
  let max = 0;
  for (const one of series) {
    max = Math.max(max, one.lastRecordedTimeSeconds);
  }
  return { min: 0, max: max > 0 ? max : 1 };
}

export function altitudeDomain(series: AltitudeSeries[], paddingFraction = 0.08): Domain {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const one of series) {
    for (const point of one.points) {
      if (point.altitudeKm < min) {
        min = point.altitudeKm;
      }
      if (point.altitudeKm > max) {
        max = point.altitudeKm;
      }
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }

  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.05, 1);
    return { min: min - pad, max: max + pad };
  }

  const padding = (max - min) * paddingFraction;
  return { min: min - padding, max: max + padding };
}

/**
 * Builds a linear mapping from a physical domain onto a view range. A degenerate
 * domain (min === max) maps everything to the middle of the range instead of
 * dividing by zero.
 */
export function createLinearScale(domain: Domain, range: { start: number; end: number }): LinearScale {
  const span = domain.max - domain.min;

  return {
    domain,
    range,
    map: (value: number) => {
      if (span === 0) {
        return (range.start + range.end) / 2;
      }
      const fraction = (value - domain.min) / span;
      return range.start + fraction * (range.end - range.start);
    },
  };
}

/** Inverted scale for the SVG y axis (view y grows downward). */
export function createAltitudeScale(domain: Domain, layout: ChartLayout): LinearScale {
  return createLinearScale(domain, { start: layout.plot.bottom, end: layout.plot.top });
}

/** Step sizes of 1, 2, or 5 times a power of ten. */
function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }
  const magnitudeOfStep = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitudeOfStep;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitudeOfStep;
}

/** Evenly spaced, human-readable tick values inside the domain. */
export function niceTicks(domain: Domain, targetCount = 5): number[] {
  const span = domain.max - domain.min;

  if (!Number.isFinite(span) || span <= 0 || targetCount < 2) {
    return [domain.min];
  }

  const step = niceStep(span / targetCount);
  const first = Math.ceil(domain.min / step - 1e-9) * step;
  const ticks: number[] = [];

  for (let value = first; value <= domain.max + step * 1e-9; value += step) {
    // Re-round each tick to the step's precision to avoid float noise in labels.
    ticks.push(Number(value.toFixed(10)));
    if (ticks.length > 100) {
      break;
    }
  }

  return ticks;
}

/** Axis label numbers: grouped thousands, no exponent notation. */
export function formatTickValue(value: number): string {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Number(value.toFixed(2));
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Decimal places that keep sampled coordinates readable in DOM attributes. */
export function roundCoordinate(value: number): number {
  return Number(value.toFixed(2));
}
