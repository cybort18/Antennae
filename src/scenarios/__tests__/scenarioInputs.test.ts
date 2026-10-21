/**
 * Scenario bridge tests: the workspace must build engine configurations without
 * re-implementing axis, unit, or timing rules.
 */
import { describe, expect, it } from 'vitest';

import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  circularOrbitalSpeedKmPerS,
  createCircularOrbitState,
  magnitude,
  validateSimulationConfig,
} from '../../simulation';
import {
  DEFAULT_SCENARIO_INPUTS,
  INPUT_LIMITS,
  buildScenarioConfig,
  describeScenarioInputs,
  inputsFromReferencePreset,
  scenarioReference,
  validateScenarioInputs,
  type ScenarioInputs,
} from '../scenarioInputs';
import { loadReferencePresets } from '../../data/referencePresets';

function referenceInputs(): ScenarioInputs {
  const loaded = loadReferencePresets();
  if (loaded.error || !loaded.presets[0]) {
    throw new Error(`Reference fixture must load: ${loaded.error ?? 'missing preset'}`);
  }
  return inputsFromReferencePreset(loaded.presets[0], {
    orbitCount: 1,
    timestepSeconds: 10,
  });
}

describe('buildScenarioConfig', () => {
  it('produces a configuration the engine accepts without issues', () => {
    expect(validateSimulationConfig(buildScenarioConfig(DEFAULT_SCENARIO_INPUTS))).toEqual([]);
  });

  it('places the particle on +x with prograde velocity on +y', () => {
    const config = buildScenarioConfig({
      ...DEFAULT_SCENARIO_INPUTS,
      altitudeKm: 400,
      speedKmPerS: 7.5,
    });
    expect(config.initialState.positionKm).toEqual({ x: EARTH_MEAN_RADIUS_KM + 400, y: 0, z: 0 });
    expect(config.initialState.velocityKmPerS.x).toBe(0);
    expect(config.initialState.velocityKmPerS.z).toBe(0);
    expect(config.initialState.velocityKmPerS.y).toBeCloseTo(7.5, 12);
    expect(magnitude(config.initialState.velocityKmPerS)).toBeCloseTo(7.5, 12);
  });

  it('scales the preset circular state instead of re-deriving the direction', () => {
    const speed = 6;
    const config = buildScenarioConfig({ ...DEFAULT_SCENARIO_INPUTS, speedKmPerS: speed });
    const radiusKm = config.initialState.positionKm.x;
    const base = createCircularOrbitState(radiusKm, EARTH_MU_KM3_S2);
    const factor = speed / magnitude(base.velocityKmPerS);

    expect(config.initialState.velocityKmPerS.y).toBeCloseTo(
      base.velocityKmPerS.y * factor,
      12,
    );
  });

  it('rounds the requested duration to a whole number of timesteps', () => {
    const config = buildScenarioConfig({
      ...DEFAULT_SCENARIO_INPUTS,
      altitudeKm: 1234,
      orbitCount: 1,
      timestepSeconds: 10,
    });
    expect(config.durationSeconds % 10).toBe(0);
    expect(config.durationSeconds).toBeGreaterThan(0);
    expect(config.sampleIntervalSeconds).toBe(10);
  });

  it('uses the central body mean radius as the documented stop radius', () => {
    expect(buildScenarioConfig(DEFAULT_SCENARIO_INPUTS).impactRadiusKm).toBe(EARTH_MEAN_RADIUS_KM);
  });

  it('is deterministic for identical inputs', () => {
    expect(JSON.stringify(buildScenarioConfig(DEFAULT_SCENARIO_INPUTS))).toBe(
      JSON.stringify(buildScenarioConfig(DEFAULT_SCENARIO_INPUTS)),
    );
  });

  it('keeps the timestep and sample interval equal so playback is never coarser than the integration', () => {
    const config = buildScenarioConfig({ ...DEFAULT_SCENARIO_INPUTS, timestepSeconds: 20 });
    expect(config.timestepSeconds).toBe(20);
    expect(config.sampleIntervalSeconds).toBe(20);
  });
});

describe('cached reference inputs', () => {
  it('uses the exact provider state, not a circular reconstruction', () => {
    const inputs = referenceInputs();
    const config = buildScenarioConfig(inputs);

    expect(config.initialState).toEqual(inputs.reference?.state);
    expect(config.initialState.positionKm).not.toBe(inputs.reference?.state.positionKm);
    expect(config.initialState.velocityKmPerS).not.toBe(inputs.reference?.state.velocityKmPerS);
    expect(config.initialState.positionKm.z).toBeCloseTo(-170.859408, 6);
    expect(config.initialState.velocityKmPerS.y).toBeCloseTo(0.700100006, 9);
  });

  it('accepts a geostationary-scale state and reports its derived radius and speed ratio', () => {
    const inputs = referenceInputs();
    const reference = scenarioReference(inputs);

    expect(inputs.altitudeKm).toBeCloseTo(35786.962, 3);
    expect(inputs.altitudeKm).toBeGreaterThan(20_000);
    expect(validateScenarioInputs(inputs)).toEqual([]);
    expect(reference.radiusKm).toBeCloseTo(42157.962, 3);
    expect(reference.speedRatio).toBeCloseTo(1, 3);
    expect(reference.durationSeconds % inputs.timestepSeconds).toBe(0);
  });

  it('labels the run as a cached reference and a hypothetical propagation', () => {
    const inputs = referenceInputs();
    const config = buildScenarioConfig(inputs);

    expect(config.label).toContain('GOES-16');
    expect(config.label).toContain('hypothetical');
    expect(config.label).not.toContain('Synthetic test particle');
    expect(describeScenarioInputs(inputs)).toContain('GOES-16');
    expect(describeScenarioInputs(inputs)).toContain('cached JPL Horizons');
  });
});

describe('scenarioReference', () => {
  it('starts at exactly one circular speed at the default altitude', () => {
    const reference = scenarioReference(DEFAULT_SCENARIO_INPUTS);
    expect(reference.speedRatio).toBeCloseTo(1, 12);
    expect(reference.circularSpeedKmPerS).toBeCloseTo(
      circularOrbitalSpeedKmPerS(EARTH_MEAN_RADIUS_KM + 400, EARTH_MU_KM3_S2),
      12,
    );
  });

  it('reports the speed as a multiple of the local circular speed', () => {
    const reference = scenarioReference({ ...DEFAULT_SCENARIO_INPUTS, speedKmPerS: 3.836 });
    expect(reference.speedRatio).toBeCloseTo(0.5, 3);
  });

  it('estimates the sample count from the requested duration', () => {
    const reference = scenarioReference(DEFAULT_SCENARIO_INPUTS);
    expect(reference.estimatedSampleCount).toBe(
      Math.round(reference.durationSeconds / reference.timestepSeconds) + 1,
    );
  });
});

describe('validateScenarioInputs', () => {
  it('accepts the documented defaults', () => {
    expect(validateScenarioInputs(DEFAULT_SCENARIO_INPUTS)).toEqual([]);
  });

  const cases: Array<{ name: string; patch: Partial<ScenarioInputs>; field: string }> = [
    { name: 'altitude below the supported range', patch: { altitudeKm: 100 }, field: 'Altitude' },
    { name: 'altitude above the supported range', patch: { altitudeKm: 60_000 }, field: 'Altitude' },
    { name: 'non-finite altitude', patch: { altitudeKm: Number.NaN }, field: 'Altitude' },
    { name: 'speed below the supported range', patch: { speedKmPerS: 0.1 }, field: 'Initial speed' },
    { name: 'speed above the supported range', patch: { speedKmPerS: 40 }, field: 'Initial speed' },
    { name: 'non-finite speed', patch: { speedKmPerS: Number.POSITIVE_INFINITY }, field: 'Initial speed' },
    { name: 'zero revolutions', patch: { orbitCount: 0 }, field: 'Revolutions' },
    { name: 'excessive revolutions', patch: { orbitCount: 50 }, field: 'Revolutions' },
    { name: 'timestep below the supported range', patch: { timestepSeconds: 0.5 }, field: 'Timestep' },
  ];

  for (const testCase of cases) {
    it(`rejects ${testCase.name}`, () => {
      const issues = validateScenarioInputs({ ...DEFAULT_SCENARIO_INPUTS, ...testCase.patch });
      expect(issues.map((issue) => issue.field)).toContain(testCase.field);
      for (const issue of issues) {
        expect(issue.message.length).toBeGreaterThan(10);
      }
    });
  }

  it('documents its limits in one place', () => {
    expect(INPUT_LIMITS.altitudeKm.min).toBeLessThan(INPUT_LIMITS.altitudeKm.max);
    expect(INPUT_LIMITS.speedKmPerS.min).toBeLessThan(INPUT_LIMITS.speedKmPerS.max);
  });
});
