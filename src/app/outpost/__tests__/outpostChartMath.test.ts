import { describe, expect, it } from 'vitest';

import {
  createOutpostChartLayout,
  projectPercentY,
  projectRadiationY,
  projectSolX,
  buildSvgPoints,
} from '../outpostChartMath';
import type { OutpostDailySample } from '../../../outpost/types';

describe('outpostChartMath', () => {
  const layout = createOutpostChartLayout(720, 220);

  it('projects Sol 0 to plot left and Sol 14 to plot right', () => {
    const x0 = projectSolX(0, 14, layout);
    const x14 = projectSolX(14, 14, layout);
    const x7 = projectSolX(7, 14, layout);

    expect(x0).toBe(layout.plot.left);
    expect(x14).toBe(layout.plot.right);
    expect(x7).toBeCloseTo(layout.plot.left + layout.plot.width / 2, 1);
  });

  it('projects 100% to plot top and 0% to plot bottom', () => {
    const y100 = projectPercentY(100, layout);
    const y0 = projectPercentY(0, layout);
    const y50 = projectPercentY(50, layout);

    expect(y100).toBe(layout.plot.top);
    expect(y0).toBe(layout.plot.bottom);
    expect(y50).toBeCloseTo(layout.plot.top + layout.plot.height / 2, 1);
  });

  it('projects radiation dose up to 60 mSv cleanly', () => {
    const y0 = projectRadiationY(0, 60, layout);
    const y60 = projectRadiationY(60, 60, layout);
    const y30 = projectRadiationY(30, 60, layout);

    expect(y0).toBe(layout.plot.bottom);
    expect(y60).toBe(layout.plot.top);
    expect(y30).toBeCloseTo(layout.plot.top + layout.plot.height / 2, 1);
  });

  it('generates deterministic SVG points string', () => {
    const mockSamples: Partial<OutpostDailySample>[] = [
      { sol: 0, batteryPercent: 100 },
      { sol: 7, batteryPercent: 50 },
      { sol: 14, batteryPercent: 20 },
    ];

    const points = buildSvgPoints(
      mockSamples as OutpostDailySample[],
      14,
      layout,
      (s, l) => projectPercentY(s.batteryPercent, l),
    );

    const parts = points.split(' ');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe(`${layout.plot.left.toFixed(1)},${layout.plot.top.toFixed(1)}`);
  });
});
