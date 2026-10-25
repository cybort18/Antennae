import { describe, expect, it } from 'vitest';

import {
  CANONICAL_OUTPOST_SCENARIO,
  calculateSolarOutputKw,
  createInitialSample,
  runOutpostSimulation,
  simulateOutpostDay,
  type SubsystemAllocation,
} from '../index';

describe('outpostSimulation', () => {
  it('calculates solar extinction consistently as dust opacity increases', () => {
    const clearKw = calculateSolarOutputKw(40, 0.2);
    const dustKw = calculateSolarOutputKw(40, 0.88);

    expect(clearKw).toBeGreaterThan(30);
    expect(dustKw).toBeLessThan(18);
    expect(clearKw).toBeGreaterThan(dustKw);
  });

  it('generates a valid initial baseline sample at sol 0', () => {
    const sample = createInitialSample(CANONICAL_OUTPOST_SCENARIO);
    expect(sample.sol).toBe(0);
    expect(sample.batteryStorageKwh).toBe(CANONICAL_OUTPOST_SCENARIO.initialBatteryKwh);
    expect(sample.batteryPercent).toBe(100);
    expect(sample.oxygenLevelPercent).toBe(20.9);
    expect(sample.cabinTemperatureC).toBe(21.0);
    expect(sample.cropHealthPercent).toBe(100);
    expect(sample.crewStatus).toBe('nominal');
    expect(sample.events).toContain('MISSION_START');
  });

  it('charges battery under surplus power generation', () => {
    const initial = createInitialSample(CANONICAL_OUTPOST_SCENARIO);
    // Lower battery to 100 kWh so surplus can charge it
    const drained = { ...initial, batteryStorageKwh: 100 };

    const allocation: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 0,
      foodProductionKw: 4,
      auxiliaryKw: 2, // Total 22 kW
    };

    const clearEnvironment = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule[0]; // tau 0.18
    const next = simulateOutpostDay(drained, allocation, clearEnvironment, CANONICAL_OUTPOST_SCENARIO);

    expect(next.powerGeneratedKw).toBeGreaterThan(allocation.lifeSupportKw + allocation.foodProductionKw + allocation.auxiliaryKw);
    expect(next.batteryStorageKwh).toBeGreaterThan(100);
  });

  it('triggers BATTERY_DEPLETED event and scales power when deficit exceeds storage', () => {
    const initial = createInitialSample(CANONICAL_OUTPOST_SCENARIO);
    const nearlyEmpty = { ...initial, batteryStorageKwh: 10 };

    // Massive demand
    const heavyAllocation: SubsystemAllocation = {
      lifeSupportKw: 30,
      radiationShieldKw: 30,
      foodProductionKw: 30,
      auxiliaryKw: 10, // Total 100 kW
    };

    const stormEnvironment = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule[5]; // Severe dust storm
    const next = simulateOutpostDay(nearlyEmpty, heavyAllocation, stormEnvironment, CANONICAL_OUTPOST_SCENARIO);

    expect(next.batteryStorageKwh).toBe(0);
    expect(next.batteryPercent).toBe(0);
    expect(next.events).toContain('BATTERY_DEPLETED');
  });

  it('inflicts high radiation dose during SPE when shielding is unpowered', () => {
    const initial = createInitialSample(CANONICAL_OUTPOST_SCENARIO);
    const unshielded: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 0, // Zero shielding!
      foodProductionKw: 14,
      auxiliaryKw: 4,
    };

    const speEnvironment = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule[5]; // Sol 6: SPE active!
    const next = simulateOutpostDay(initial, unshielded, speEnvironment, CANONICAL_OUTPOST_SCENARIO);

    expect(next.events).toContain('SOLAR_PARTICLE_EVENT_ACTIVE');
    expect(next.events).toContain('RADIATION_SPIKE_UNSHIELDED');
    expect(next.dailyRadiationDoseMsv).toBeGreaterThan(35);
  });

  it('successfully mitigates SPE radiation when shielding is fully powered', () => {
    const initial = createInitialSample(CANONICAL_OUTPOST_SCENARIO);
    // To keep shielding fully powered during the peak storm (22.8 kW generation),
    // food is rationed (0 kW) so total demand (30 kW) is well within generation + 240 kWh battery
    const fullyShielded: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 12, // Fully powered shield!
      foodProductionKw: 0,
      auxiliaryKw: 2,
    };

    const speEnvironment = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule[5]; // Sol 6: SPE active!
    const next = simulateOutpostDay(initial, fullyShielded, speEnvironment, CANONICAL_OUTPOST_SCENARIO);

    expect(next.dailyRadiationDoseMsv).toBeLessThan(3.0);
    expect(next.events).not.toContain('RADIATION_SPIKE_UNSHIELDED');
  });

  it('causes irreversible crop blight after consecutive starvation sols', () => {
    const initial = createInitialSample(CANONICAL_OUTPOST_SCENARIO);
    const starvedCrops: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 12,
      foodProductionKw: 0, // Zero food power!
      auxiliaryKw: 4,
    };

    let state = initial;
    for (let i = 0; i < 3; i++) {
      state = simulateOutpostDay(
        state,
        starvedCrops,
        CANONICAL_OUTPOST_SCENARIO.environmentalSchedule[i],
        CANONICAL_OUTPOST_SCENARIO,
      );
    }

    expect(state.consecutiveCropStarvationSols).toBe(3);
    expect(state.cropHealthPercent).toBe(0);
    expect(state.events).toContain('CROP_BLIGHT_PERMANENT');
  });

  it('is completely deterministic across repeated full 14-Sol runs', () => {
    // Adaptive policy: shield active on Sols 6-8 (SPE), food rationed during dust storm
    const schedule = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule;
    const dynamicPolicy: SubsystemAllocation[] = schedule.map((env) => ({
      lifeSupportKw: 16,
      radiationShieldKw: env.solarParticleEventActive ? 12 : 0,
      foodProductionKw: env.dustOpacityTau > 0.6 ? 4 : 10,
      auxiliaryKw: 2,
    }));

    const run1 = runOutpostSimulation(CANONICAL_OUTPOST_SCENARIO, dynamicPolicy);
    const run2 = runOutpostSimulation(CANONICAL_OUTPOST_SCENARIO, dynamicPolicy);

    expect(run1.completed).toBe(true);
    expect(run2.completed).toBe(true);
    expect(run1.samples.length).toBe(run2.samples.length);

    for (let i = 0; i < run1.samples.length; i++) {
      expect(run1.samples[i]).toEqual(run2.samples[i]);
    }
  });
});
