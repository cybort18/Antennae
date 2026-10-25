/**
 * Deterministic simulation engine for the Outpost Resource Management trainer.
 *
 * Simulates daily conservation-of-energy, atmospheric oxygen recycling, thermal
 * maintenance, radiation attenuation, and agricultural crop health over a mission.
 *
 * Deterministic: identical inputs and environmental schedule produce bit-for-bit
 * identical OutpostDailySample sequences.
 */

import {
  CABIN_TEMP_CRITICAL_C,
  CABIN_TEMP_NOMINAL_C,
  CABIN_TEMP_SAFE_MIN_C,
  CROP_STARVATION_DEATH_SOLS,
  ECLSS_NOMINAL_POWER_KW,
  FOOD_MIN_SURVIVAL_POWER_KW,
  FOOD_NOMINAL_POWER_KW,
  MARS_SOL_HOURS,
  MARS_SURFACE_BACKGROUND_RADIATION_MSV_SOL,
  OXYGEN_CRITICAL_PERCENT,
  OXYGEN_NOMINAL_PERCENT,
  OXYGEN_SAFE_MIN_PERCENT,
  SHIELD_NOMINAL_POWER_KW,
  SPE_SHIELDED_RADIATION_MSV_SOL,
  SPE_UNSHIELDED_RADIATION_MSV_SOL,
} from './constants';
import type {
  CrewHealthStatus,
  DailyEnvironment,
  OutpostDailySample,
  OutpostRunResult,
  OutpostScenario,
  SubsystemAllocation,
} from './types';

/**
 * Calculates surface solar output based on atmospheric dust optical depth tau.
 * Models exponential atmospheric extinction along with forward scattering.
 */
export function calculateSolarOutputKw(nominalPeakKw: number, dustTau: number): number {
  const safeTau = Math.max(0, dustTau);
  // Extinction factor: clear sky (tau 0.2) ~ 83%, dense storm (tau 0.9) ~ 32%
  const transmissionFactor = Math.max(0.1, Math.exp(-0.95 * safeTau) + 0.08 * (1 - safeTau));
  return Math.round(nominalPeakKw * transmissionFactor * 100) / 100;
}

/**
 * Creates the initial baseline sample prior to Sol 1 progression.
 */
export function createInitialSample(scenario: OutpostScenario): OutpostDailySample {
  return {
    sol: 0,
    powerGeneratedKw: scenario.baseNuclearKw + scenario.solarArrayNominalKw,
    solarGeneratedKw: scenario.solarArrayNominalKw,
    nuclearGeneratedKw: scenario.baseNuclearKw,
    powerConsumedKw: 0,
    netPowerKw: 0,
    batteryStorageKwh: scenario.initialBatteryKwh,
    batteryCapacityKwh: scenario.batteryCapacityKwh,
    batteryPercent: Math.round((scenario.initialBatteryKwh / scenario.batteryCapacityKwh) * 1000) / 10,
    oxygenLevelPercent: OXYGEN_NOMINAL_PERCENT,
    cabinTemperatureC: CABIN_TEMP_NOMINAL_C,
    dailyRadiationDoseMsv: 0,
    cumulativeRadiationDoseMsv: 0,
    cropHealthPercent: 100,
    consecutiveCropStarvationSols: 0,
    crewStatus: 'nominal',
    events: ['MISSION_START'],
  };
}

/**
 * Steps the outpost simulation forward by exactly one Martian Sol.
 */
export function simulateOutpostDay(
  previousSample: OutpostDailySample,
  allocation: SubsystemAllocation,
  environment: DailyEnvironment,
  scenario: OutpostScenario,
): OutpostDailySample {
  const events: string[] = [];

  // 1. Generation
  const nuclearKw = scenario.baseNuclearKw;
  const solarKw = calculateSolarOutputKw(scenario.solarArrayNominalKw, environment.dustOpacityTau);
  const powerGeneratedKw = nuclearKw + solarKw;

  if (environment.dustOpacityTau >= 0.7) {
    events.push('DUST_STORM_SEVERE');
  } else if (environment.dustOpacityTau >= 0.45) {
    events.push('DUST_STORM_MODERATE');
  }

  if (environment.solarParticleEventActive) {
    events.push('SOLAR_PARTICLE_EVENT_ACTIVE');
  }

  // 2. Power Demand & Grid Balancing
  const requestedKw =
    Math.max(0, allocation.lifeSupportKw) +
    Math.max(0, allocation.radiationShieldKw) +
    Math.max(0, allocation.foodProductionKw) +
    Math.max(0, allocation.auxiliaryKw);

  const netPowerKw = powerGeneratedKw - requestedKw;
  const solEnergyGeneratedKwh = powerGeneratedKw * MARS_SOL_HOURS;
  const solEnergyRequestedKwh = requestedKw * MARS_SOL_HOURS;

  let batteryStorageKwh = previousSample.batteryStorageKwh;
  let satisfactionRatio = 1.0;

  if (netPowerKw >= 0) {
    // Net positive: charge battery
    const energySurplusKwh = netPowerKw * MARS_SOL_HOURS;
    batteryStorageKwh = Math.min(scenario.batteryCapacityKwh, batteryStorageKwh + energySurplusKwh);
  } else {
    // Net deficit: draw from battery storage
    const deficitEnergyKwh = Math.abs(netPowerKw) * MARS_SOL_HOURS;
    if (batteryStorageKwh >= deficitEnergyKwh) {
      batteryStorageKwh -= deficitEnergyKwh;
    } else {
      // Battery brownout / depletion during the Sol
      events.push('BATTERY_DEPLETED');
      const totalAvailableEnergyKwh = solEnergyGeneratedKwh + batteryStorageKwh;
      satisfactionRatio =
        solEnergyRequestedKwh > 0
          ? Math.max(0, Math.min(1.0, totalAvailableEnergyKwh / solEnergyRequestedKwh))
          : 1.0;
      batteryStorageKwh = 0;
    }
  }

  const effectiveEclssKw = allocation.lifeSupportKw * satisfactionRatio;
  const effectiveShieldKw = allocation.radiationShieldKw * satisfactionRatio;
  const effectiveFoodKw = allocation.foodProductionKw * satisfactionRatio;

  // 3. Life Support (ECLSS): Oxygen & Temperature
  let oxygenLevelPercent = previousSample.oxygenLevelPercent;
  let cabinTemperatureC = previousSample.cabinTemperatureC;

  if (effectiveEclssKw >= ECLSS_NOMINAL_POWER_KW) {
    // Recover toward nominal
    oxygenLevelPercent = Math.min(
      OXYGEN_NOMINAL_PERCENT,
      oxygenLevelPercent + 0.3 * (effectiveEclssKw / ECLSS_NOMINAL_POWER_KW),
    );
    cabinTemperatureC = Math.min(
      CABIN_TEMP_NOMINAL_C,
      cabinTemperatureC + 1.2 * (effectiveEclssKw / ECLSS_NOMINAL_POWER_KW),
    );
  } else {
    // Underpowered ECLSS
    const deficitFraction = (ECLSS_NOMINAL_POWER_KW - effectiveEclssKw) / ECLSS_NOMINAL_POWER_KW;
    oxygenLevelPercent = Math.max(12.0, oxygenLevelPercent - 1.85 * deficitFraction);

    // Heat loss toward Martian ambient temperature
    const tempDelta = cabinTemperatureC - environment.ambientTemperatureC;
    cabinTemperatureC = Math.max(
      environment.ambientTemperatureC,
      cabinTemperatureC - tempDelta * 0.22 * deficitFraction,
    );

    if (oxygenLevelPercent < OXYGEN_SAFE_MIN_PERCENT) {
      events.push('HYPOXIA_WARNING');
    }
    if (cabinTemperatureC < CABIN_TEMP_SAFE_MIN_C) {
      events.push('HYPOTHERMIA_WARNING');
    }
  }

  // 4. Radiation Exposure
  let dailyRadiationDoseMsv = MARS_SURFACE_BACKGROUND_RADIATION_MSV_SOL;

  if (environment.solarParticleEventActive) {
    const shieldFraction = Math.max(0, Math.min(1.0, effectiveShieldKw / SHIELD_NOMINAL_POWER_KW));
    const speDose =
      SPE_SHIELDED_RADIATION_MSV_SOL +
      (1.0 - shieldFraction) * (SPE_UNSHIELDED_RADIATION_MSV_SOL - SPE_SHIELDED_RADIATION_MSV_SOL);
    dailyRadiationDoseMsv += speDose;

    if (shieldFraction < 0.6) {
      events.push('RADIATION_SPIKE_UNSHIELDED');
    }
  }

  const cumulativeRadiationDoseMsv =
    previousSample.cumulativeRadiationDoseMsv + dailyRadiationDoseMsv;

  // 5. Food Production (Greenhouse)
  let cropHealthPercent = previousSample.cropHealthPercent;
  let consecutiveCropStarvationSols = previousSample.consecutiveCropStarvationSols;

  if (cropHealthPercent > 0) {
    if (effectiveFoodKw >= FOOD_NOMINAL_POWER_KW) {
      // Optimal conditions: recover health
      cropHealthPercent = Math.min(100.0, cropHealthPercent + 3.0);
      consecutiveCropStarvationSols = 0;
    } else if (effectiveFoodKw >= FOOD_MIN_SURVIVAL_POWER_KW) {
      // Strained conditions: slight crop stress
      cropHealthPercent = Math.max(0, cropHealthPercent - 3.5);
      consecutiveCropStarvationSols = 0;
    } else {
      // Starvation: darkness and sub-zero cooling
      consecutiveCropStarvationSols += 1;
      cropHealthPercent = Math.max(0, cropHealthPercent - 18.0);
      events.push('CROPS_STARVING');

      if (consecutiveCropStarvationSols >= CROP_STARVATION_DEATH_SOLS) {
        cropHealthPercent = 0;
        events.push('CROP_BLIGHT_PERMANENT');
      }
    }
  }

  // 6. Crew Health Status
  let crewStatus: CrewHealthStatus = 'nominal';
  if (
    oxygenLevelPercent <= OXYGEN_CRITICAL_PERCENT ||
    cabinTemperatureC <= CABIN_TEMP_CRITICAL_C ||
    cumulativeRadiationDoseMsv >= 85.0
  ) {
    crewStatus = 'incapacitated';
    events.push('CREW_INCAPACITATED');
  } else if (
    oxygenLevelPercent < OXYGEN_SAFE_MIN_PERCENT ||
    cabinTemperatureC < CABIN_TEMP_SAFE_MIN_C ||
    cumulativeRadiationDoseMsv >= 40.0
  ) {
    crewStatus = 'critical';
  } else if (effectiveEclssKw < ECLSS_NOMINAL_POWER_KW || environment.solarParticleEventActive) {
    crewStatus = 'strained';
  }

  const batteryPercent =
    scenario.batteryCapacityKwh > 0
      ? Math.round((batteryStorageKwh / scenario.batteryCapacityKwh) * 1000) / 10
      : 0;

  return {
    sol: environment.sol,
    powerGeneratedKw: Math.round(powerGeneratedKw * 100) / 100,
    solarGeneratedKw: Math.round(solarKw * 100) / 100,
    nuclearGeneratedKw: Math.round(nuclearKw * 100) / 100,
    powerConsumedKw: Math.round(requestedKw * satisfactionRatio * 100) / 100,
    netPowerKw: Math.round(netPowerKw * 100) / 100,
    batteryStorageKwh: Math.round(batteryStorageKwh * 100) / 100,
    batteryCapacityKwh: scenario.batteryCapacityKwh,
    batteryPercent,
    oxygenLevelPercent: Math.round(oxygenLevelPercent * 10) / 10,
    cabinTemperatureC: Math.round(cabinTemperatureC * 10) / 10,
    dailyRadiationDoseMsv: Math.round(dailyRadiationDoseMsv * 100) / 100,
    cumulativeRadiationDoseMsv: Math.round(cumulativeRadiationDoseMsv * 100) / 100,
    cropHealthPercent: Math.round(cropHealthPercent * 10) / 10,
    consecutiveCropStarvationSols,
    crewStatus,
    events,
  };
}

/**
 * Runs a complete outpost simulation across an entire scenario schedule.
 * Can take a single uniform allocation policy or an array of daily allocations.
 */
export function runOutpostSimulation(
  scenario: OutpostScenario,
  allocationPolicy: SubsystemAllocation | SubsystemAllocation[],
): OutpostRunResult {
  const schedule = scenario.environmentalSchedule;
  const samples: OutpostDailySample[] = [];
  const normalizedAllocations: SubsystemAllocation[] = [];

  let currentSample = createInitialSample(scenario);
  samples.push(currentSample);

  for (let i = 0; i < schedule.length; i++) {
    const environment = schedule[i];
    const allocation = Array.isArray(allocationPolicy)
      ? allocationPolicy[i] ?? allocationPolicy[allocationPolicy.length - 1]
      : allocationPolicy;

    normalizedAllocations.push(allocation);

    currentSample = simulateOutpostDay(currentSample, allocation, environment, scenario);
    samples.push(currentSample);

    if (currentSample.crewStatus === 'incapacitated') {
      return {
        scenario,
        allocations: normalizedAllocations,
        samples,
        completed: false,
        terminalReason: 'Crew incapacitation due to catastrophic environmental failure.',
      };
    }
  }

  return {
    scenario,
    allocations: normalizedAllocations,
    samples,
    completed: true,
  };
}
