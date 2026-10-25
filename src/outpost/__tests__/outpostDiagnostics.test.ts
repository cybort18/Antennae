import { describe, expect, it } from 'vitest';

import {
  CANONICAL_OUTPOST_SCENARIO,
  createInitialSample,
  SHACKLETON_LUNAR_SCENARIO,
  type SubsystemAllocation,
} from '../index';
import { diagnoseOutpostState } from '../outpostDiagnostics';

describe('outpostDiagnostics', () => {
  const nominalAllocation: SubsystemAllocation = {
    lifeSupportKw: 16.0,
    radiationShieldKw: 12.0,
    foodProductionKw: 14.0,
    auxiliaryKw: 4.0,
  };

  it('diagnoses nominal status when all systems are well-powered with surplus', () => {
    const initialSample = createInitialSample(CANONICAL_OUTPOST_SCENARIO);
    const env = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule[0];

    const diag = diagnoseOutpostState(
      initialSample,
      nominalAllocation,
      env,
      CANONICAL_OUTPOST_SCENARIO,
    );

    expect(diag.overallStatus).toBe('nominal');
    expect(diag.headline).toContain('operating nominally');
    expect(diag.items.every((i) => i.severity === 'nominal')).toBe(true);
  });

  it('diagnoses battery depletion emergency with actionable recovery advice', () => {
    const sample = {
      ...createInitialSample(CANONICAL_OUTPOST_SCENARIO),
      batteryStorageKwh: 0,
      batteryPercent: 0,
      oxygenLevelPercent: 17.8, // Critical hypoxia
    };
    const dustEnv = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule[5]; // Sol 6 dust storm

    const diag = diagnoseOutpostState(
      sample,
      nominalAllocation,
      dustEnv,
      CANONICAL_OUTPOST_SCENARIO,
    );

    expect(diag.overallStatus).toBe('critical');
    const batteryDiag = diag.items.find((i) => i.id === 'diag-battery-depleted');
    expect(batteryDiag).toBeDefined();
    expect(batteryDiag?.severity).toBe('danger');
    expect(batteryDiag?.cause).toContain('Atmospheric dust storm');
    expect(batteryDiag?.recommendation).toContain('Dust Storm Conservation');

    const o2Diag = diag.items.find((i) => i.id === 'diag-o2-critical');
    expect(o2Diag).toBeDefined();
    expect(o2Diag?.cause).toContain('battery depletion');
  });

  it('diagnoses solar particle event hazard when shield is underpowered', () => {
    const sample = createInitialSample(CANONICAL_OUTPOST_SCENARIO);
    const speEnv = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule[5]; // SPE active

    const unshieldedAllocation: SubsystemAllocation = {
      lifeSupportKw: 16.0,
      radiationShieldKw: 0.0, // Zero shield during SPE
      foodProductionKw: 14.0,
      auxiliaryKw: 4.0,
    };

    const diag = diagnoseOutpostState(
      sample,
      unshieldedAllocation,
      speEnv,
      CANONICAL_OUTPOST_SCENARIO,
    );

    expect(diag.overallStatus).toBe('strained');
    const radDiag = diag.items.find((i) => i.subsystem === 'radiation');
    expect(radDiag).toBeDefined();
    expect(radDiag?.title).toContain('Unshielded Solar Flare Exposure');
    expect(radDiag?.recommendation).toContain('Boost Radiation Shielding to 12.0 kW');
  });

  it('adjusts diagnostic cause text for Moon lunar shadow environment', () => {
    const sample = {
      ...createInitialSample(SHACKLETON_LUNAR_SCENARIO),
      batteryStorageKwh: 0,
      batteryPercent: 0,
    };
    const shadowEnv = SHACKLETON_LUNAR_SCENARIO.environmentalSchedule.find(
      (e) => e.solarInsolationFraction === 0.0,
    )!;

    const diag = diagnoseOutpostState(
      sample,
      nominalAllocation,
      shadowEnv,
      SHACKLETON_LUNAR_SCENARIO,
    );

    const batteryDiag = diag.items.find((i) => i.id === 'diag-battery-depleted');
    expect(batteryDiag?.cause).toContain('Crater shadow');
    expect(batteryDiag?.cause).toContain('35 kW Kilopower reactor');
  });
});
