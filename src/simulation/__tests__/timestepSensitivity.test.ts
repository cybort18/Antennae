/**
 * Timestep sensitivity / convergence check.
 *
 * Expected behavior for this integrator (velocity-Verlet / kick-drift-kick
 * leapfrog, second order in the timestep):
 * - The amplitude of the radial oscillation ("breathing") of an ideal circular
 *   orbit decreases quadratically with the step: halving dt should reduce it by
 *   about 4x. This is the property asserted below.
 * - The energy error of a symplectic method stays BOUNDED (it does not drift
 *   secularly at fixed step size). The sampled maximum energy deviation also
 *   decreased in this test case, by roughly 16x per halving; that ratio is
 *   case-specific and is therefore asserted only as a decrease with generous
 *   margin, not as a universal law.
 * - A coarse step still "completes" but is visibly inaccurate, which is why the
 *   runner emits a COARSE_TIMESTEP_ADVISORY rather than pretending accuracy.
 *
 * Measured on this implementation (duration 5520 s, one orbit):
 *   dt=120 s  radius oscillation 9.203e-3 relative, energy deviation 8.316e-5
 *   dt= 60 s  radius oscillation 2.309e-3 (4.0x smaller), energy 5.305e-6
 *   dt= 30 s  radius oscillation 5.776e-4 (4.0x), energy 3.333e-7
 *   dt= 15 s  radius oscillation 1.444e-4 (4.0x), energy 2.086e-8
 *   dt=7.5 s  radius oscillation 3.611e-5 (4.0x), energy 1.304e-9
 */
import { describe, expect, it } from 'vitest';

import { EARTH_MEAN_RADIUS_KM } from '../constants';
import { createCircularEarthOrbitScenario } from '../presets';
import { runSimulation } from '../runSimulation';
import { magnitude } from '../vector3';

const ALTITUDE_KM = 400;
const RADIUS_KM = EARTH_MEAN_RADIUS_KM + ALTITUDE_KM;
const DURATION_SECONDS = 5520; // ~1 orbit, divisible by every timestep below
const TIMESTEPS = [120, 60, 30, 15, 7.5];

type Measurement = {
  timestep: number;
  energyDeviation: number;
  radiusOscillation: number;
  warningCodes: string[];
};

function measure(timestep: number): Measurement {
  const result = runSimulation(
    createCircularEarthOrbitScenario({
      altitudeKm: ALTITUDE_KM,
      timestepSeconds: timestep,
      durationSeconds: DURATION_SECONDS,
      sampleIntervalSeconds: timestep,
    }),
  );
  const radii = result.samples.map((sample) => magnitude(sample.state.positionKm));
  return {
    timestep,
    energyDeviation: result.diagnostics.maxRelativeEnergyDeviation,
    radiusOscillation: (Math.max(...radii) - Math.min(...radii)) / RADIUS_KM,
    warningCodes: result.warnings.map((warning) => warning.code),
  };
}

const measurements = TIMESTEPS.map(measure);

describe('timestep sensitivity and convergence', () => {
  it('reduces the radial oscillation by about 4x for each halving of the step', () => {
    for (let i = 1; i < measurements.length; i += 1) {
      const coarser = measurements[i - 1];
      const finer = measurements[i];
      expect(finer.timestep).toBe(coarser.timestep / 2);

      const ratio = coarser.radiusOscillation / finer.radiusOscillation;
      // Second-order method: the expected ratio is 4. The band allows for the
      // finite sampling of the oscillation amplitude.
      expect(ratio).toBeGreaterThan(3.5);
      expect(ratio).toBeLessThan(4.5);
    }
  });

  it('keeps the sampled energy deviation bounded and decreasing with the step', () => {
    for (let i = 1; i < measurements.length; i += 1) {
      const coarser = measurements[i - 1];
      const finer = measurements[i];
      expect(finer.energyDeviation).toBeLessThan(coarser.energyDeviation);
      // Generous margin: measured ~16x per halving in this test case.
      expect(coarser.energyDeviation / finer.energyDeviation).toBeGreaterThan(8);
    }
    // Even the coarsest run in this table stays below the instability stop.
    for (const measurement of measurements) {
      expect(measurement.energyDeviation).toBeLessThan(0.01);
    }
  });

  it('flags a coarse step with an advisory instead of silently implying accuracy', () => {
    const coarse = measurements[0];
    expect(coarse.timestep).toBe(120);
    expect(coarse.warningCodes).toContain('COARSE_TIMESTEP_ADVISORY');

    // Finer steps (below 1/50 of the local orbital period, about 111 s) are not flagged.
    for (const measurement of measurements.slice(1)) {
      expect(measurement.warningCodes).not.toContain('COARSE_TIMESTEP_ADVISORY');
    }
  });

  it('keeps every sampled state finite at every tested step size', () => {
    for (const measurement of measurements) {
      expect(Number.isFinite(measurement.energyDeviation)).toBe(true);
      expect(Number.isFinite(measurement.radiusOscillation)).toBe(true);
      expect(measurement.radiusOscillation).toBeGreaterThan(0);
    }
  });
});
