/**
 * Failure and warning paths: invalid or numerically unsafe runs must produce a
 * clear error or a flagged stop, never plausible-looking output.
 *
 * Cases covered:
 * 1. Singular initial geometry (r = 0) is rejected before integration.
 * 2. A plunge toward the force center without a configured impact radius stops
 *    with ENERGY_DEVIATION_UNSTABLE rather than "completing" with a slingshot
 *    artifact (this was observed before the check was added: the run reported
 *    status 'completed' while the probe had been flung to ~1.2e6 km with a
 *    positive, unbound energy).
 * 3. A dive below the configured impact radius (Earth's surface) stops with
 *    IMPACT_RADIUS_REACHED, and no sample lies beyond the limit.
 * 4. Unsupported numeric magnitudes are rejected as input.
 */
import { describe, expect, it } from 'vitest';

import { EARTH_MEAN_RADIUS_KM, EARTH_MU_KM3_S2 } from '../constants';
import { SimulationInputError } from '../errors';
import { EARTH_CENTRAL_BODY } from '../presets';
import { runSimulation } from '../runSimulation';
import type { SimulationConfig } from '../types';
import { MAX_SUPPORTED_RADIUS_KM } from '../validation';
import { isFiniteVec3, magnitude, vec3 } from '../vector3';

const RADIUS_KM = EARTH_MEAN_RADIUS_KM + 400;
const CIRCULAR_SPEED_KM_PER_S = Math.sqrt(EARTH_MU_KM3_S2 / RADIUS_KM);

function config(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    label: 'failure-path fixture',
    centralBody: EARTH_CENTRAL_BODY,
    initialState: {
      positionKm: vec3(RADIUS_KM, 0, 0),
      velocityKmPerS: vec3(0, CIRCULAR_SPEED_KM_PER_S, 0),
    },
    timestepSeconds: 10,
    durationSeconds: 6000,
    ...overrides,
  };
}

describe('invalid input produces an error, not output', () => {
  it('rejects a singular initial state', () => {
    expect(() =>
      runSimulation(
        config({ initialState: { positionKm: vec3(0, 0, 0), velocityKmPerS: vec3(7.67, 0, 0) } }),
      ),
    ).toThrowError(SimulationInputError);
  });

  it('rejects positions beyond the supported numeric range', () => {
    expect(() =>
      runSimulation(
        config({
          initialState: {
            positionKm: vec3(MAX_SUPPORTED_RADIUS_KM * 2, 0, 0),
            velocityKmPerS: vec3(0, CIRCULAR_SPEED_KM_PER_S, 0),
          },
        }),
      ),
    ).toThrowError(SimulationInputError);
  });
});

describe('numerically unsafe dynamics stop with a warning', () => {
  const plunge = runSimulation(
    config({
      label: 'radial plunge with no impact radius',
      initialState: { positionKm: vec3(RADIUS_KM, 0, 0), velocityKmPerS: vec3(0, 0, 0) },
      impactRadiusKm: undefined,
    }),
  );

  it('stops instead of completing with a slingshot artifact', () => {
    expect(plunge.status).toBe('stopped');
    expect(plunge.stopReason).toBe('ENERGY_DEVIATION_UNSTABLE');
    expect(plunge.warnings.map((warning) => warning.code)).toContain('ENERGY_DEVIATION_UNSTABLE');
    expect(plunge.diagnostics.steps).toBeLessThan(600);
  });

  it('explains why the result is unreliable and reports the observed deviation', () => {
    const warning = plunge.warnings.find((entry) => entry.code === 'ENERGY_DEVIATION_UNSTABLE');
    expect(warning).toBeDefined();
    expect(warning?.message).toMatch(/no longer trustworthy|not trustworthy/);
    expect(warning?.timeSeconds).toBeGreaterThan(0);
    expect(plunge.diagnostics.maxRelativeEnergyDeviation).toBeGreaterThan(0.1);
  });

  it('never emits a non-finite sample', () => {
    for (const sample of plunge.samples) {
      expect(isFiniteVec3(sample.state.positionKm)).toBe(true);
      expect(isFiniteVec3(sample.state.velocityKmPerS)).toBe(true);
      expect(Number.isFinite(sample.timeSeconds)).toBe(true);
    }
  });
});

describe('diving below the configured impact radius', () => {
  const dive = runSimulation(
    config({
      label: 'sub-surface dive',
      // Sub-circular speed produces a perigee below the surface.
      initialState: { positionKm: vec3(RADIUS_KM, 0, 0), velocityKmPerS: vec3(0, 2, 0) },
      impactRadiusKm: EARTH_MEAN_RADIUS_KM,
    }),
  );

  it('stops at the impact radius with an explicit warning', () => {
    expect(dive.status).toBe('stopped');
    expect(dive.stopReason).toBe('IMPACT_RADIUS_REACHED');
    expect(dive.warnings.map((warning) => warning.code)).toContain('IMPACT_RADIUS_REACHED');
    expect(dive.completedDurationSeconds).toBeLessThan(dive.durationSeconds);
  });

  it('does not present states below the impact radius as valid results', () => {
    for (const sample of dive.samples) {
      expect(magnitude(sample.state.positionKm)).toBeGreaterThan(EARTH_MEAN_RADIUS_KM);
    }
  });

  it('reports the detected crossing instead of emitting the out-of-limit state', () => {
    const warning = dive.warnings.find((entry) => entry.code === 'IMPACT_RADIUS_REACHED');
    const lastSample = dive.samples[dive.samples.length - 1];
    expect(warning).toBeDefined();
    expect(warning?.message).toMatch(/detected at r =/);
    // The last sample is the last state still inside the valid region; the
    // crossing itself is reported by the warning.
    expect(warning?.timeSeconds).toBeGreaterThan(lastSample.timeSeconds);
    expect(lastSample.timeSeconds).toBeLessThan(dive.durationSeconds);
  });
});
