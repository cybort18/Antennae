/**
 * Display metrics derived from recorded simulation samples.
 *
 * Every value here is computed from `SimulationResult.samples` using the
 * engine's own derived-metric utilities. Nothing is estimated, smoothed, or
 * invented; aggregates cover the recorded samples only (not the continuous
 * solution between them).
 */

import {
  eccentricity,
  magnitude,
  specificAngularMomentum,
  specificOrbitalEnergyKm2PerS2,
  type SimulationResult,
  type SimulationSample,
} from '../simulation';

export type SampleMetrics = {
  timeSeconds: number;
  radiusKm: number;
  /** Radius minus the reference body radius. Negative values are impossible here. */
  altitudeKm: number;
  speedKmPerS: number;
  specificEnergyKm2PerS2: number;
  eccentricity: number;
  specificAngularMomentumKm2PerS: number;
};

/**
 * `bodyRadiusKm` is the reference radius used to express altitude. The workspace
 * passes the same mean radius that built the scenario.
 */
export function sampleMetrics(
  sample: SimulationSample,
  gravitationalParameterKm3PerS2: number,
  bodyRadiusKm: number,
): SampleMetrics {
  const radiusKm = magnitude(sample.state.positionKm);
  return {
    timeSeconds: sample.timeSeconds,
    radiusKm,
    altitudeKm: radiusKm - bodyRadiusKm,
    speedKmPerS: magnitude(sample.state.velocityKmPerS),
    specificEnergyKm2PerS2: specificOrbitalEnergyKm2PerS2(
      sample.state,
      gravitationalParameterKm3PerS2,
    ),
    eccentricity: eccentricity(sample.state, gravitationalParameterKm3PerS2),
    specificAngularMomentumKm2PerS: magnitude(specificAngularMomentum(sample.state)),
  };
}

export type RunAggregates = {
  sampleCount: number;
  minRadiusKm: number;
  maxRadiusKm: number;
  minAltitudeKm: number;
  maxAltitudeKm: number;
  minSpeedKmPerS: number;
  maxSpeedKmPerS: number;
};

export function runAggregates(result: SimulationResult, bodyRadiusKm: number): RunAggregates {
  const radii = result.samples.map((sample) => magnitude(sample.state.positionKm));
  const speeds = result.samples.map((sample) => magnitude(sample.state.velocityKmPerS));

  return {
    sampleCount: result.samples.length,
    minRadiusKm: Math.min(...radii),
    maxRadiusKm: Math.max(...radii),
    minAltitudeKm: Math.min(...radii) - bodyRadiusKm,
    maxAltitudeKm: Math.max(...radii) - bodyRadiusKm,
    minSpeedKmPerS: Math.min(...speeds),
    maxSpeedKmPerS: Math.max(...speeds),
  };
}

/** Simulated time of the last recorded sample (playback can never exceed it). */
export function lastSampleTimeSeconds(result: SimulationResult): number {
  const last = result.samples[result.samples.length - 1];
  return last ? last.timeSeconds : 0;
}
