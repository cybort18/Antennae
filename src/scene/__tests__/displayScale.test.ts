/**
 * Display-scale tests.
 *
 * The transform is display-only, uniform, and one-way; these tests pin that
 * behaviour so a future change cannot silently distort the scene relative to the
 * physics, and confirm the NOT TO SCALE disclosure is what the UI shows.
 */
import { describe, expect, it } from 'vitest';

import { DISPLAY_SCALE_NOTE, SCENE_UNITS_PER_KILOMETRE, toScenePoint, toSceneUnits } from '../displayScale';

describe('display scale', () => {
  it('uses one scene unit per 1,000 km', () => {
    expect(SCENE_UNITS_PER_KILOMETRE).toBe(1 / 1000);
    expect(toSceneUnits(1000)).toBe(1);
    expect(toSceneUnits(6371)).toBeCloseTo(6.371, 12);
  });

  it('is uniform, so relative orbital geometry keeps its proportions', () => {
    expect(toSceneUnits(6771) / toSceneUnits(6371)).toBeCloseTo(6771 / 6371, 12);
  });

  it('converts each axis independently', () => {
    expect(toScenePoint({ x: 6771, y: 0, z: -2000 })).toEqual([6.771, 0, -2]);
  });

  it('discloses the scale and the NOT TO SCALE label in user-facing text', () => {
    expect(DISPLAY_SCALE_NOTE).toContain('1 scene unit = 1,000 km');
    expect(DISPLAY_SCALE_NOTE).toMatch(/exaggerated/i);
  });
});
