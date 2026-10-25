/**
 * Deterministic evaluator for the Junior Astronaut Outpost Trainer.
 *
 * Compares simulation samples against NASA health and safety thresholds:
 * - Crew ECLSS survival (Oxygen >= 19.5%, Temp >= 16.0°C)
 * - Cumulative radiation dosage (<= 40.0 mSv)
 * - Food security (Crop health >= 40.0%, no permanent blight)
 * - Electrical grid integrity (No terminal unpowered blackout)
 */

import {
  CABIN_TEMP_SAFE_MIN_C,
  CADET_MAX_RADIATION_DOSE_MSV,
  MIN_PASSING_CROP_HEALTH_PERCENT,
  OXYGEN_SAFE_MIN_PERCENT,
} from './constants';
import type {
  OutpostCriterionResult,
  OutpostEvaluation,
  OutpostOutcome,
  OutpostRunResult,
} from './types';

export function evaluateOutpostMission(result: OutpostRunResult | null | undefined): OutpostEvaluation {
  if (!result || !result.samples || result.samples.length <= 1) {
    return {
      outcome: 'NOT_EVALUABLE',
      summary: 'Mission data incomplete or simulation not yet run.',
      criteria: [],
      maxRadiationDoseMsv: 0,
      minOxygenPercent: 0,
      minCabinTempC: 0,
      finalCropHealthPercent: 0,
      finalBatteryPercent: 0,
      debriefNotes: ['No simulation recorded. Configure power allocations and run the mission.'],
    };
  }

  const samples = result.samples.slice(1); // Exclude Sol 0 baseline
  const lastSample = samples[samples.length - 1];

  let minOxygen = 100.0;
  let minTemp = 100.0;
  let maxRadiation = 0.0;
  let everIncapacitated = false;

  for (const sample of samples) {
    if (sample.oxygenLevelPercent < minOxygen) {
      minOxygen = sample.oxygenLevelPercent;
    }
    if (sample.cabinTemperatureC < minTemp) {
      minTemp = sample.cabinTemperatureC;
    }
    if (sample.cumulativeRadiationDoseMsv > maxRadiation) {
      maxRadiation = sample.cumulativeRadiationDoseMsv;
    }
    if (sample.crewStatus === 'incapacitated') {
      everIncapacitated = true;
    }
  }

  const finalCropHealth = lastSample.cropHealthPercent;
  const finalBatteryPercent = lastSample.batteryPercent;

  // Criterion 1: Crew Atmospheric Life Support
  const oxygenPassed = minOxygen >= OXYGEN_SAFE_MIN_PERCENT;
  const tempPassed = minTemp >= CABIN_TEMP_SAFE_MIN_C;
  const eclssPassed = oxygenPassed && tempPassed && !everIncapacitated;

  const eclssCriterion: OutpostCriterionResult = {
    id: 'eclss-atmosphere',
    label: 'Crew Life Support & Atmosphere (ECLSS)',
    passed: eclssPassed,
    observedValue: `Min O2: ${minOxygen}%, Min Temp: ${minTemp}°C`,
    thresholdValue: `>= ${OXYGEN_SAFE_MIN_PERCENT}% O2, >= ${CABIN_TEMP_SAFE_MIN_C}°C`,
    details: eclssPassed
      ? 'Cabin atmospheric composition and thermal envelope remained within nominal astronaut safety margins.'
      : 'ECLSS power starvation caused dangerous hypoxia or cabin hypothermia.',
  };

  // Criterion 2: Radiation Dosage Protection
  const radiationPassed = maxRadiation <= CADET_MAX_RADIATION_DOSE_MSV;
  const radiationCriterion: OutpostCriterionResult = {
    id: 'radiation-protection',
    label: 'Radiation Shielding & Solar Flare Defense',
    passed: radiationPassed,
    observedValue: `${maxRadiation.toFixed(1)} mSv cumulative`,
    thresholdValue: `<= ${CADET_MAX_RADIATION_DOSE_MSV.toFixed(1)} mSv`,
    details: radiationPassed
      ? 'Active storm shelter shielding successfully deflected peak Coronal Mass Ejection (SPE) radiation.'
      : 'Unshielded solar flare exposure exceeded NASA astronaut short-mission career safety limits.',
  };

  // Criterion 3: Agricultural Food Security
  const cropsSurvived = finalCropHealth >= MIN_PASSING_CROP_HEALTH_PERCENT;
  const cropCriterion: OutpostCriterionResult = {
    id: 'food-production',
    label: 'Hydroponic Crop Survival & Food Security',
    passed: cropsSurvived,
    observedValue: `${finalCropHealth.toFixed(1)}% biomass viable`,
    thresholdValue: `>= ${MIN_PASSING_CROP_HEALTH_PERCENT}%`,
    details: cropsSurvived
      ? 'Greenhouse preserved viable biomass; outpost food stores will sustain the crew until next resupply.'
      : 'Prolonged power starvation caused irreversible crop blight and agricultural collapse.',
  };

  // Criterion 4: Power Grid & Mission Completion
  const gridPassed = result.completed && lastSample.batteryPercent > 5.0;
  const gridCriterion: OutpostCriterionResult = {
    id: 'power-continuity',
    label: 'Power Grid Continuity & Storage Reserves',
    passed: gridPassed,
    observedValue: `${finalBatteryPercent.toFixed(1)}% battery reserve`,
    thresholdValue: `> 5.0% end of Sol 14`,
    details: gridPassed
      ? 'Energy storage sustained base operations throughout dust storm without catastrophic blackouts.'
      : 'Battery storage was completely exhausted during critical operations.',
  };

  const criteria = [eclssCriterion, radiationCriterion, cropCriterion, gridCriterion];
  const allPassed = criteria.every((c) => c.passed);
  const outcome: OutpostOutcome = allPassed ? 'PASS' : 'FAIL';

  const debriefNotes: string[] = [];

  if (outcome === 'PASS') {
    debriefNotes.push(
      'MISSION CERTIFIED: Junior Astronaut Outpost Commander rating achieved.',
      'You balanced competing power demands effectively: the crew survived with safe radiation dosage while preserving agricultural continuity.',
      'NASA Benchmark: On Mars, Solar Particle Events emit dangerous ionizing proton flux. Active storm shelter deflection coupled with managed battery conservation is the baseline strategy outlined in NASA DRA 5.0.',
    );
  } else {
    debriefNotes.push('MISSION FAILED: Base critical systems collapsed under environmental pressure.');
    if (!radiationPassed) {
      debriefNotes.push(
        'Radiation Alert: During Sols 6-8, a Solar Particle Event struck the outpost. Radiation shielding requires at least 12 kW to achieve full magnetic deflection.',
      );
    }
    if (!eclssPassed) {
      debriefNotes.push(
        'Life Support Alert: ECLSS requires baseline power to run oxygen sabatier reactors and cabin resistive heating.',
      );
    }
    if (!cropsSurvived) {
      debriefNotes.push(
        'Agriculture Alert: Hydroponic plants can endure 1-2 sols of reduced power, but 3 consecutive starvation sols cause irreversible crop blight.',
      );
    }
  }

  const summary =
    outcome === 'PASS'
      ? 'Outpost nominal: Life support, radiation shielding, power grid, and crops successfully maintained through the crisis.'
      : 'Outpost failure: Critical safety limits breached during the dust storm / solar flare.';

  return {
    outcome,
    summary,
    criteria,
    maxRadiationDoseMsv: maxRadiation,
    minOxygenPercent: minOxygen,
    minCabinTempC: minTemp,
    finalCropHealthPercent: finalCropHealth,
    finalBatteryPercent,
    debriefNotes,
  };
}
