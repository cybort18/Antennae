import { describe, expect, it } from 'vitest';

import {
  calculateSolarOutputKw,
  createInitialSample,
  evaluateOutpostMission,
  runOutpostSimulation,
  simulateOutpostDay,
  type SubsystemAllocation,
} from '../index';
import {
  SHACKLETON_LUNAR_SCENARIO,
} from '../scenarios';

describe('lunarSimulation (Artemis Shackleton Base)', () => {
  it('initializes lunar scenario with 480 kWh battery and zero baseline radiation at Day 0', () => {
    const sample = createInitialSample(SHACKLETON_LUNAR_SCENARIO);

    expect(sample.sol).toBe(0);
    expect(sample.batteryStorageKwh).toBe(480.0);
    expect(sample.batteryPercent).toBe(100);
    expect(sample.cumulativeRadiationDoseMsv).toBe(0.0);
    expect(sample.crewStatus).toBe('nominal');
    expect(SHACKLETON_LUNAR_SCENARIO.setting).toBe('moon');
  });

  it('generates zero solar power during polar crater shadow periods (insolation = 0)', () => {
    const solarKw = calculateSolarOutputKw(40, 0.0, 0.0);
    expect(solarKw).toBe(0);
  });

  it('runs on 35 kW nuclear baseload when in lunar night shadow', () => {
    const initial = createInitialSample(SHACKLETON_LUNAR_SCENARIO);
    // Find shadow day (Day 4 has solarInsolationFraction = 0.0)
    const shadowEnv = SHACKLETON_LUNAR_SCENARIO.environmentalSchedule.find(
      (e) => e.solarInsolationFraction === 0.0
    )!;
    expect(shadowEnv).toBeDefined();

    const lowAllocation: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 0,
      foodProductionKw: 4,
      auxiliaryKw: 2, // Total 22 kW < 35 kW nuclear capacity
    };

    const next = simulateOutpostDay(
      initial,
      lowAllocation,
      shadowEnv,
      SHACKLETON_LUNAR_SCENARIO
    );

    // Generation should be strictly the 35 kW nuclear power
    expect(next.powerGeneratedKw).toBe(35.0);
    expect(next.batteryStorageKwh).toBe(480.0); // No drain since 22 kW demand < 35 kW gen
  });

  it('drains battery when subsystem demand exceeds 35 kW nuclear output during lunar night', () => {
    const initial = createInitialSample(SHACKLETON_LUNAR_SCENARIO);
    const shadowEnv = SHACKLETON_LUNAR_SCENARIO.environmentalSchedule.find(
      (e) => e.solarInsolationFraction === 0.0
    )!;

    const highAllocation: SubsystemAllocation = {
      lifeSupportKw: 20,
      radiationShieldKw: 14,
      foodProductionKw: 8,
      auxiliaryKw: 4, // Total 46 kW > 35 kW
    };

    const next = simulateOutpostDay(
      initial,
      highAllocation,
      shadowEnv,
      SHACKLETON_LUNAR_SCENARIO
    );

    // Deficit is (46 - 35) kW = 11 kW over 24 hours = 264 kWh deficit
    expect(next.powerGeneratedKw).toBe(35.0);
    expect(next.batteryStorageKwh).toBeLessThan(480.0);
    expect(next.batteryStorageKwh).toBeCloseTo(480.0 - (11 * 24), 1);
  });

  it('simulates higher background radiation on the Moon without atmospheric shielding', () => {
    const initial = createInitialSample(SHACKLETON_LUNAR_SCENARIO);
    const clearEnv = SHACKLETON_LUNAR_SCENARIO.environmentalSchedule[0];

    // Minimal radiation shielding
    const unshielded: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 0,
      foodProductionKw: 4,
      auxiliaryKw: 2,
    };

    const next = simulateOutpostDay(
      initial,
      unshielded,
      clearEnv,
      SHACKLETON_LUNAR_SCENARIO
    );

    // Moon background radiation is 1.10 mSv/day (vs Mars ~0.65 mSv/day)
    expect(next.cumulativeRadiationDoseMsv).toBeGreaterThan(1.0);
  });

  it('contains tactical incident dilemmas on Day 4 and Day 8 for Shackleton base', () => {
    const dilemmas = SHACKLETON_LUNAR_SCENARIO.dilemmas ?? [];
    expect(dilemmas.length).toBe(2);

    const day4Dilemma = dilemmas.find((d) => d.sol === 4);
    const day8Dilemma = dilemmas.find((d) => d.sol === 8);

    expect(day4Dilemma).toBeDefined();
    expect(day4Dilemma?.title).toContain('Cryogenic Lock');
    expect(day8Dilemma).toBeDefined();
    expect(day8Dilemma?.title).toContain('Micrometeoroid');
  });

  it('awards stars and commander ranks accurately in evaluator', () => {
    // Run full simulation with conservation preset
    const conservationAllocation: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 12,
      foodProductionKw: 4,
      auxiliaryKw: 2,
    };

    const run = runOutpostSimulation(
      SHACKLETON_LUNAR_SCENARIO,
      Array(14).fill(conservationAllocation)
    );

    const evaluation = evaluateOutpostMission(run);
    expect(evaluation.starsAwarded).toBeGreaterThanOrEqual(1);
    expect(evaluation.starsAwarded).toBeLessThanOrEqual(3);
    expect(evaluation.commanderRank).toBeDefined();
    expect(['Junior Outpost Commander', 'Senior Outpost Commander', 'Master Outpost Commander']).toContain(
      evaluation.commanderRank
    );
  });
});
