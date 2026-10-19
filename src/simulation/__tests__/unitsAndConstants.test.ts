/**
 * Unit and constant sanity tests.
 *
 * These check that the declared unit convention and the recorded constants are
 * dimensionally and numerically consistent. They do NOT claim that the values
 * were re-verified against a live external source; see the note in
 * src/simulation/constants.ts.
 */
import { describe, expect, it } from 'vitest';

import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MASS_KG,
  EARTH_MU_KM3_S2,
  NEWTONIAN_G_KM3_KG_S2,
} from '../constants';
import { circularOrbitalSpeedKmPerS } from '../derivedMetrics';
import { EARTH_CENTERED_INERTIAL_FRAME, INTERNAL_UNIT_SYSTEM } from '../units';

describe('internal unit system', () => {
  it('declares the km/s/kg convention', () => {
    expect(INTERNAL_UNIT_SYSTEM.distance).toBe('km');
    expect(INTERNAL_UNIT_SYSTEM.time).toBe('s');
    expect(INTERNAL_UNIT_SYSTEM.mass).toBe('kg');
    expect(INTERNAL_UNIT_SYSTEM.velocity).toBe('km/s');
    expect(INTERNAL_UNIT_SYSTEM.acceleration).toBe('km/s^2');
    expect(INTERNAL_UNIT_SYSTEM.gravitationalParameter).toBe('km^3/s^2');
  });

  it('documents the frame as Earth-centered, inertial, and epoch-free', () => {
    expect(EARTH_CENTERED_INERTIAL_FRAME.center).toBe('central-body-center-of-mass');
    expect(EARTH_CENTERED_INERTIAL_FRAME.inertial).toBe(true);
    expect(EARTH_CENTERED_INERTIAL_FRAME.epochAttached).toBe(false);
    expect(EARTH_CENTERED_INERTIAL_FRAME.handedness).toBe('right-handed');
  });
});

describe('documented constants', () => {
  it('records the standard Earth gravitational parameter in km^3/s^2', () => {
    // Range check, not a new measurement: published Earth GM values are
    // ~3.986004e5 km^3/s^2. A value far outside this band indicates a unit error.
    expect(EARTH_MU_KM3_S2).toBeGreaterThan(398_600);
    expect(EARTH_MU_KM3_S2).toBeLessThan(398_601);
    expect(EARTH_MEAN_RADIUS_KM).toBeCloseTo(6371, 0);
  });

  it('converts the Newtonian constant from SI to km^3 kg^-1 s^-2 consistently', () => {
    const gSi = 6.6743e-11; // m^3 kg^-1 s^-2
    expect(NEWTONIAN_G_KM3_KG_S2).toBeCloseTo(gSi * 1e-9, 25);
  });

  it('cross-checks GM against G x M within the quoted mass uncertainty', () => {
    // G x M is far less precise than GM because the Earth mass carries about
    // 1e-4 relative uncertainty. A 0.1% band therefore only catches gross unit
    // or conversion mistakes, which is exactly its purpose.
    const gTimesM = NEWTONIAN_G_KM3_KG_S2 * EARTH_MASS_KG;
    const relativeDifference = Math.abs(gTimesM - EARTH_MU_KM3_S2) / EARTH_MU_KM3_S2;
    expect(relativeDifference).toBeLessThan(1e-3);
  });

  it('produces a plausible low-Earth-orbit circular speed', () => {
    // Published circular speeds at ~400 km altitude are about 7.67 km/s.
    const speed = circularOrbitalSpeedKmPerS(EARTH_MEAN_RADIUS_KM + 400, EARTH_MU_KM3_S2);
    expect(speed).toBeGreaterThan(7.6);
    expect(speed).toBeLessThan(7.8);
  });
});
