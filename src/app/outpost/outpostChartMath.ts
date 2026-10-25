/**
 * Scale and geometric mapping math for the 14-Sol Outpost Resource Timeline Chart.
 *
 * Isolated pure functions for deterministic coordinate projections and tick generation.
 */

import type { OutpostDailySample } from '../../outpost/types';

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface OutpostChartLayout {
  width: number;
  height: number;
  margin: ChartMargin;
  plot: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  };
}

export function createOutpostChartLayout(width = 720, height = 220): OutpostChartLayout {
  const margin: ChartMargin = { top: 20, right: 30, bottom: 36, left: 50 };
  return {
    width,
    height,
    margin,
    plot: {
      left: margin.left,
      right: width - margin.right,
      top: margin.top,
      bottom: height - margin.bottom,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    },
  };
}

/**
 * Projects a sol number (0 to 14) onto the horizontal X axis coordinate.
 */
export function projectSolX(sol: number, totalSols: number, layout: OutpostChartLayout): number {
  const fraction = Math.max(0, Math.min(1, sol / totalSols));
  return layout.plot.left + fraction * layout.plot.width;
}

/**
 * Projects a percentage value (0 to 100%) onto the vertical Y axis coordinate.
 */
export function projectPercentY(percent: number, layout: OutpostChartLayout): number {
  const clamped = Math.max(0, Math.min(100, percent));
  const fraction = clamped / 100;
  return layout.plot.bottom - fraction * layout.plot.height;
}

/**
 * Projects cumulative radiation mSv (0 to 60 mSv) onto the vertical Y axis coordinate.
 */
export function projectRadiationY(doseMsv: number, maxDose = 60, layout: OutpostChartLayout): number {
  const clamped = Math.max(0, Math.min(maxDose, doseMsv));
  const fraction = clamped / maxDose;
  return layout.plot.bottom - fraction * layout.plot.height;
}

/**
 * Formats an array of samples into an SVG polyline points string.
 */
export function buildSvgPoints(
  samples: OutpostDailySample[],
  totalSols: number,
  layout: OutpostChartLayout,
  projector: (sample: OutpostDailySample, layout: OutpostChartLayout) => number,
): string {
  return samples
    .map((s) => {
      const x = projectSolX(s.sol, totalSols, layout).toFixed(1);
      const y = projector(s, layout).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');
}
