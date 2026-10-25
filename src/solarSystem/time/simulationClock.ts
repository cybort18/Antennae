/**
 * Simulation clock logic and continuous time progression helpers.
 *
 * All time calculations are pure functions operating on Julian Dates.
 * Frame time advances are clamped to resist background tab stalls and lag spikes.
 */

import {
  MAX_SUPPORTED_JD,
  MIN_SUPPORTED_JD,
} from '../astronomy/julianDate';
import type { PlaybackRateConfig } from './types';

/** Maximum wall-clock delta in seconds applied per animation frame (100 ms). */
export const MAX_CLOCK_FRAME_DELTA_SEC = 0.1;

export const SIMULATION_RATES: readonly PlaybackRateConfig[] = [
  {
    id: 'realtime',
    label: '1×',
    daysPerSecond: 1 / 86400,
    description: 'True real-time (1 second per second)',
  },
  {
    id: '1h-sec',
    label: '1 hr/s',
    daysPerSecond: 1 / 24,
    description: '1 simulation hour per real second',
  },
  {
    id: '1d-sec',
    label: '1 d/s',
    daysPerSecond: 1.0,
    description: '1 Earth day per real second (Recommended)',
  },
  {
    id: '10d-sec',
    label: '10 d/s',
    daysPerSecond: 10.0,
    description: '10 Earth days per real second',
  },
  {
    id: '30d-sec',
    label: '30 d/s',
    daysPerSecond: 30.0,
    description: '30 Earth days per real second (~1 month/s)',
  },
  {
    id: '1y-sec',
    label: '1 yr/s',
    daysPerSecond: 365.25,
    description: '1 Julian year per real second',
  },
] as const;

export const DEFAULT_RATE_DAYS_PER_SEC = 1.0;

/**
 * Clamps a Julian Date to the validated Standish 1800 AD - 2050 AD temporal window.
 */
export function clampJulianDate(jd: number): number {
  if (!Number.isFinite(jd)) {
    return 2451545.0; // J2000
  }
  return Math.min(Math.max(jd, MIN_SUPPORTED_JD), MAX_SUPPORTED_JD);
}

/**
 * Advances simulation Julian Date by real-time frame delta seconds at specified rate.
 */
export function advanceSimulationJd(
  currentJd: number,
  wallDeltaSec: number,
  daysPerSec: number,
): number {
  const boundedJd = clampJulianDate(currentJd);
  if (!Number.isFinite(wallDeltaSec) || wallDeltaSec <= 0) {
    return boundedJd;
  }
  if (!Number.isFinite(daysPerSec) || daysPerSec === 0) {
    return boundedJd;
  }

  const effectiveDeltaSec = Math.min(wallDeltaSec, MAX_CLOCK_FRAME_DELTA_SEC);
  const nextJd = boundedJd + effectiveDeltaSec * daysPerSec;
  return clampJulianDate(nextJd);
}

/**
 * Steps simulation Julian Date forward or backward by an exact delta in Earth days.
 */
export function stepSimulationJd(currentJd: number, deltaDays: number): number {
  const boundedJd = clampJulianDate(currentJd);
  if (!Number.isFinite(deltaDays) || deltaDays === 0) {
    return boundedJd;
  }
  return clampJulianDate(boundedJd + deltaDays);
}
