/**
 * Determinism: identical input and configuration must produce identical output,
 * including warnings and diagnostics. Any hidden randomness, clock dependence,
 * or shared mutable state would break these tests.
 */
import { describe, expect, it } from 'vitest';

import { EARTH_MEAN_RADIUS_KM } from '../constants';
import { EARTH_CENTRAL_BODY, createCircularEarthOrbitScenario } from '../presets';
import { runSimulation } from '../runSimulation';
import type { SimulationConfig } from '../types';
import { vec3 } from '../vector3';

function buildConfig(): SimulationConfig {
  return createCircularEarthOrbitScenario({
    altitudeKm: 400,
    timestepSeconds: 10,
    durationSeconds: 5000,
    sampleIntervalSeconds: 50,
  });
}

describe('deterministic output', () => {
  it('produces an identical result for two runs of the same configuration', () => {
    const first = runSimulation(buildConfig());
    const second = runSimulation(buildConfig());

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second.samples.length).toBe(first.samples.length);
    expect(second.diagnostics).toEqual(first.diagnostics);
    expect(second.warnings).toEqual(first.warnings);
  });

  it('is unaffected by a prior unrelated run (no shared mutable state)', () => {
    const first = runSimulation(buildConfig());

    // A different, deliberately unstable run in between must not leak state.
    runSimulation({
      label: 'plunge',
      centralBody: EARTH_CENTRAL_BODY,
      initialState: { positionKm: vec3(EARTH_MEAN_RADIUS_KM + 400, 0, 0), velocityKmPerS: vec3(0, 0, 0) },
      timestepSeconds: 10,
      durationSeconds: 6000,
    });

    const third = runSimulation(buildConfig());
    expect(JSON.stringify(third)).toBe(JSON.stringify(first));
  });

  it('keeps identical numeric values at every sample, not merely the same shape', () => {
    const first = runSimulation(buildConfig());
    const second = runSimulation(buildConfig());

    for (let i = 0; i < first.samples.length; i += 1) {
      expect(second.samples[i].timeSeconds).toBe(first.samples[i].timeSeconds);
      expect(second.samples[i].state.positionKm).toEqual(first.samples[i].state.positionKm);
      expect(second.samples[i].state.velocityKmPerS).toEqual(first.samples[i].state.velocityKmPerS);
    }
  });

  it('does not embed wall-clock timestamps that would break reproducibility', () => {
    const serialized = JSON.stringify(runSimulation(buildConfig()));
    expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
