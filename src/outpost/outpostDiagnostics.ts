/**
 * Causal Diagnostic Engine for Outpost Mission Trainer.
 *
 * Translates numerical simulation states and physical threshold breaches into
 * transparent, human-readable cause-and-effect explanations.
 *
 * Strictly deterministic and physics-driven: no LLM generation, no invented numbers.
 */

import {
  CADET_MAX_RADIATION_DOSE_MSV,
  CRITICAL_RADIATION_DOSE_MSV,
  ECLSS_NOMINAL_POWER_KW,
  FOOD_MIN_SURVIVAL_POWER_KW,
  MIN_PASSING_CROP_HEALTH_PERCENT,
  OXYGEN_CRITICAL_PERCENT,
  OXYGEN_SAFE_MIN_PERCENT,
} from './constants';
import type {
  DailyEnvironment,
  OutpostDailySample,
  OutpostScenario,
  SubsystemAllocation,
} from './types';

export interface DiagnosticItem {
  id: string;
  subsystem: 'eclss' | 'radiation' | 'food' | 'power';
  severity: 'nominal' | 'warning' | 'danger';
  title: string;
  cause: string;
  impact: string;
  recommendation: string;
}

export interface OutpostDiagnostics {
  overallStatus: 'nominal' | 'strained' | 'critical';
  headline: string;
  items: DiagnosticItem[];
}

export function diagnoseOutpostState(
  sample: OutpostDailySample,
  allocation: SubsystemAllocation,
  environment: DailyEnvironment,
  scenario: OutpostScenario,
): OutpostDiagnostics {
  const items: DiagnosticItem[] = [];

  const totalDemand =
    allocation.lifeSupportKw +
    allocation.radiationShieldKw +
    allocation.foodProductionKw +
    allocation.auxiliaryKw;

  const netPower = sample.powerGeneratedKw - totalDemand;

  // 1. Power Grid & Battery Diagnostics
  if (sample.batteryStorageKwh <= 0) {
    items.push({
      id: 'diag-battery-depleted',
      subsystem: 'power',
      severity: 'danger',
      title: 'Main Battery Depleted (0 kWh)',
      cause:
        scenario.setting === 'mars'
          ? `Atmospheric dust storm (τ = ${environment.dustOpacityTau.toFixed(2)}) reduced solar array output, while demand (${totalDemand.toFixed(1)} kW) exceeded generation (${sample.powerGeneratedKw.toFixed(1)} kW).`
          : `Crater shadow cut solar generation to 0 kW, while total demand (${totalDemand.toFixed(1)} kW) exceeded the 35 kW Kilopower reactor output.`,
      impact:
        'All subsystems are receiving proportional brownout power. ECLSS and active radiation shield cannot operate at nominal ratings.',
      recommendation:
        'Immediately switch to "Dust Storm Conservation" or reduce Greenhouse / Auxiliary power to restore ECLSS to ≥16 kW.',
    });
  } else if (netPower < 0) {
    const hoursRemaining = (sample.batteryStorageKwh / Math.abs(netPower)).toFixed(1);
    items.push({
      id: 'diag-battery-discharging',
      subsystem: 'power',
      severity: 'warning',
      title: `Battery Discharging (${Math.abs(netPower).toFixed(1)} kW Deficit)`,
      cause: `Subsystem demand (${totalDemand.toFixed(1)} kW) exceeds current surface generation (${sample.powerGeneratedKw.toFixed(1)} kW).`,
      impact: `Battery reserves will last approximately ${hoursRemaining} hours under current consumption before brownout.`,
      recommendation:
        'Throttle non-essential loads (Greenhouse or Avionics) to bring demand closer to generation.',
    });
  } else {
    items.push({
      id: 'diag-power-nominal',
      subsystem: 'power',
      severity: 'nominal',
      title: `Power Grid Surplus (+${netPower.toFixed(1)} kW Charging)`,
      cause: `Generation (${sample.powerGeneratedKw.toFixed(1)} kW) exceeds active demand (${totalDemand.toFixed(1)} kW).`,
      impact: `Surplus power is recharging the battery bank (${sample.batteryPercent.toFixed(0)}% full).`,
      recommendation: 'Current power allocation strategy is sustainable.',
    });
  }

  // 2. Life Support (ECLSS) & Cabin Atmosphere Diagnostics
  if (sample.oxygenLevelPercent <= OXYGEN_CRITICAL_PERCENT) {
    items.push({
      id: 'diag-o2-critical',
      subsystem: 'eclss',
      severity: 'danger',
      title: 'Critical Hypoxia Emergency (O₂ ≤ 18.0%)',
      cause:
        'ECLSS life support has been starved of required 16.0 kW electricity due to battery depletion.',
      impact: 'Crew is experiencing severe hypoxia and will become incapacitated.',
      recommendation:
        'Prioritize ECLSS power immediately to 16.0 kW; cut food production to 0 kW if necessary.',
    });
  } else if (sample.oxygenLevelPercent < OXYGEN_SAFE_MIN_PERCENT) {
    items.push({
      id: 'diag-o2-warning',
      subsystem: 'eclss',
      severity: 'warning',
      title: 'Elevated Hypoxia Risk (O₂ < 19.5%)',
      cause:
        allocation.lifeSupportKw < ECLSS_NOMINAL_POWER_KW
          ? `ECLSS allocation (${allocation.lifeSupportKw.toFixed(1)} kW) is below the 16.0 kW nominal requirement.`
          : 'Power brownout prevented full ECLSS delivery.',
      impact: 'Cabin oxygen concentration is dropping below safe metabolic thresholds.',
      recommendation: 'Ensure at least 16.0 kW is allocated to ECLSS life support.',
    });
  } else {
    items.push({
      id: 'diag-o2-nominal',
      subsystem: 'eclss',
      severity: 'nominal',
      title: 'Cabin Atmosphere Nominal (20.9% O₂)',
      cause: 'ECLSS electrolysis and CO₂ scrubbers are fully powered at ≥16 kW.',
      impact: 'Crew respiratory health and thermal equilibrium are completely protected.',
      recommendation: 'Maintain at least 16.0 kW allocation to keep ECLSS stable.',
    });
  }

  // 3. Radiation Exposure Diagnostics
  if (sample.cumulativeRadiationDoseMsv >= CRITICAL_RADIATION_DOSE_MSV) {
    items.push({
      id: 'diag-rad-critical',
      subsystem: 'radiation',
      severity: 'danger',
      title: 'Severe Radiation Sickness (Dose ≥ 80 mSv)',
      cause: 'Solar particle flare struck habitat while active shielding was unpowered.',
      impact: 'Crew has absorbed acute radiation sickness doses.',
      recommendation: 'Active magnetic shielding must be maintained at ≥12 kW during SPE flares.',
    });
  } else if (sample.cumulativeRadiationDoseMsv >= CADET_MAX_RADIATION_DOSE_MSV) {
    items.push({
      id: 'diag-rad-warning',
      subsystem: 'radiation',
      severity: 'warning',
      title: 'Cadet Radiation Safety Limit Exceeded (>40 mSv)',
      cause:
        'Cumulative solar and cosmic radiation exposure has breached the maximum mission certification threshold.',
      impact: 'Mission evaluation criterion for astronaut radiation safety will FAIL.',
      recommendation:
        'Power the active storm shelter to 12.0 kW during solar particle events (Sols 6–8 on Mars, Days 6–9 on Moon).',
    });
  } else if (environment.solarParticleEventActive) {
    items.push({
      id: 'diag-rad-spe',
      subsystem: 'radiation',
      severity: allocation.radiationShieldKw >= 12.0 ? 'nominal' : 'warning',
      title:
        allocation.radiationShieldKw >= 12.0
          ? 'SPE Flare Deflected by Active Shield'
          : 'Unshielded Solar Flare Exposure',
      cause: 'A coronal mass ejection is bombarding the surface with high-energy protons.',
      impact:
        allocation.radiationShieldKw >= 12.0
          ? 'Active magnetic deflector reduces proton flux by ~97%.'
          : 'Unshielded crew is absorbing dangerous ionizing radiation.',
      recommendation:
        allocation.radiationShieldKw >= 12.0
          ? 'Maintain 12 kW shield power until flare passes.'
          : 'Boost Radiation Shielding to 12.0 kW immediately.',
    });
  }

  // 4. Food Production & Crop Health Diagnostics
  if (sample.cropHealthPercent === 0) {
    items.push({
      id: 'diag-food-blighted',
      subsystem: 'food',
      severity: 'danger',
      title: 'Permanent Hydroponic Crop Blight (0%)',
      cause: 'Greenhouse experienced 3 consecutive Sols with less than 4.0 kW survival power.',
      impact: 'All hydroponic seedlings have frozen or died in unheated darkness.',
      recommendation: 'In future runs, never leave greenhouse unpowered for 3 consecutive days.',
    });
  } else if (sample.cropHealthPercent < MIN_PASSING_CROP_HEALTH_PERCENT) {
    items.push({
      id: 'diag-food-strained',
      subsystem: 'food',
      severity: 'warning',
      title: 'Crop Biomass Depleted Below Passing Standard (<40%)',
      cause:
        allocation.foodProductionKw < FOOD_MIN_SURVIVAL_POWER_KW
          ? 'Greenhouse is currently starved of survival heating and LED grow light energy.'
          : 'Recent dark periods caused severe biomass degradation.',
      impact: 'Long-term outpost food viability is compromised.',
      recommendation:
        'Allocate at least 14.0 kW to allow hydroponic seedlings to recover health.',
    });
  }

  // Determine overall status
  const hasDanger = items.some((i) => i.severity === 'danger');
  const hasWarning = items.some((i) => i.severity === 'warning');

  let overallStatus: OutpostDiagnostics['overallStatus'] = 'nominal';
  let headline = 'All outpost life-support and energy systems operating nominally.';

  if (hasDanger) {
    overallStatus = 'critical';
    const firstDanger = items.find((i) => i.severity === 'danger');
    headline = `CRITICAL ALERT: ${firstDanger?.title ?? 'Subsystem emergency detected'}. Immediate intervention required.`;
  } else if (hasWarning) {
    overallStatus = 'strained';
    const firstWarning = items.find((i) => i.severity === 'warning');
    headline = `OPERATIONAL STRAIN: ${firstWarning?.title ?? 'Subsystems strained under current space weather'}.`;
  }

  return {
    overallStatus,
    headline,
    items,
  };
}
