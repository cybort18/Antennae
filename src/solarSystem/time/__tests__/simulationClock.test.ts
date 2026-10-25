import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RATE_DAYS_PER_SEC,
  MAX_CLOCK_FRAME_DELTA_SEC,
  SIMULATION_RATES,
  advanceSimulationJd,
  clampJulianDate,
  stepSimulationJd,
} from '../index';
import {
  J2000_EPOCH_JD,
  MAX_SUPPORTED_JD,
  MIN_SUPPORTED_JD,
} from '../../astronomy/julianDate';

describe('Simulation Clock', () => {
  it('clamps Julian Date strictly within 1800 AD to 2050 AD temporal boundaries', () => {
    expect(clampJulianDate(MIN_SUPPORTED_JD - 100)).toBe(MIN_SUPPORTED_JD);
    expect(clampJulianDate(MAX_SUPPORTED_JD + 100)).toBe(MAX_SUPPORTED_JD);
    expect(clampJulianDate(J2000_EPOCH_JD)).toBe(J2000_EPOCH_JD);
  });

  it('advances Julian Date accurately based on wall delta and playback rate', () => {
    const startJd = J2000_EPOCH_JD;
    const deltaSec = 0.05; // 50 ms frame
    const rateDaysPerSec = 10.0; // 10 days/sec

    const nextJd = advanceSimulationJd(startJd, deltaSec, rateDaysPerSec);
    // 0.05 s * 10 d/s = 0.5 days
    expect(nextJd - startJd).toBeCloseTo(0.5, 6);
  });

  it('caps frame advancement to MAX_CLOCK_FRAME_DELTA_SEC to prevent tab-switching lag skips', () => {
    const startJd = J2000_EPOCH_JD;
    const hugeDeltaSec = 5.0; // 5-second lag spike or tab switch
    const rateDaysPerSec = 1.0;

    const nextJd = advanceSimulationJd(startJd, hugeDeltaSec, rateDaysPerSec);
    // Capped at MAX_CLOCK_FRAME_DELTA_SEC (0.1s) * 1.0 = 0.1 days
    expect(nextJd - startJd).toBeCloseTo(MAX_CLOCK_FRAME_DELTA_SEC * rateDaysPerSec, 6);
  });

  it('steps Julian Date by exact day increments', () => {
    const startJd = J2000_EPOCH_JD;
    expect(stepSimulationJd(startJd, 10)).toBeCloseTo(startJd + 10, 6);
    expect(stepSimulationJd(startJd, -10)).toBeCloseTo(startJd - 10, 6);
  });

  it('provides all expected standardized playback rates including 1d/s default', () => {
    expect(DEFAULT_RATE_DAYS_PER_SEC).toBe(1.0);
    expect(SIMULATION_RATES.some((r) => r.id === '1d-sec' && r.daysPerSecond === 1.0)).toBe(true);
    expect(SIMULATION_RATES.some((r) => r.id === '1y-sec' && r.daysPerSecond === 365.25)).toBe(true);
  });
});
