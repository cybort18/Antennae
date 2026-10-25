/**
 * Scenario definitions for the Junior Astronaut Outpost Trainer.
 *
 * Provides the canonical challenge scenario: "The Jezero Sol 42 Crisis",
 * modeling a 14-Sol period where a Martian dust storm reduces solar insolation
 * concurrent with a coronal mass ejection / Solar Particle Event (SPE).
 */

import {
  BASELINE_BATTERY_CAPACITY_KWH,
  BASELINE_INITIAL_BATTERY_KWH,
  BASELINE_NUCLEAR_KW,
  BASELINE_SOLAR_NOMINAL_KW,
  OUTPOST_CREW_COUNT,
} from './constants';
import type { DailyEnvironment, OutpostScenario } from './types';

/**
 * 14-Sol environmental schedule for the canonical Mars challenge.
 *
 * Timeline:
 * - Sols 1-3: Clear skies, nominal conditions (tau ~ 0.20, no solar flare).
 * - Sols 4-5: Dust storm onset (tau rises to 0.55 -> 0.75, ambient drops).
 * - Sols 6-8: Peak crisis! Severe storm (tau ~ 0.88) + Solar Particle Event (SPE active).
 * - Sols 9-11: Dust storm waning (tau ~ 0.50 -> 0.35, SPE cleared).
 * - Sols 12-14: Clear skies returning (tau ~ 0.22, nominal conditions).
 */
export const JEZERO_CRISIS_ENVIRONMENT: DailyEnvironment[] = [
  { sol: 1, dustOpacityTau: 0.18, solarParticleEventActive: false, ambientTemperatureC: -58 },
  { sol: 2, dustOpacityTau: 0.20, solarParticleEventActive: false, ambientTemperatureC: -59 },
  { sol: 3, dustOpacityTau: 0.24, solarParticleEventActive: false, ambientTemperatureC: -60 },
  { sol: 4, dustOpacityTau: 0.52, solarParticleEventActive: false, ambientTemperatureC: -62 },
  { sol: 5, dustOpacityTau: 0.76, solarParticleEventActive: false, ambientTemperatureC: -65 },
  // Solar flare event occurs during peak dust storm:
  { sol: 6, dustOpacityTau: 0.88, solarParticleEventActive: true, ambientTemperatureC: -68 },
  { sol: 7, dustOpacityTau: 0.85, solarParticleEventActive: true, ambientTemperatureC: -67 },
  { sol: 8, dustOpacityTau: 0.78, solarParticleEventActive: true, ambientTemperatureC: -65 },
  // Storm settling:
  { sol: 9, dustOpacityTau: 0.58, solarParticleEventActive: false, ambientTemperatureC: -63 },
  { sol: 10, dustOpacityTau: 0.42, solarParticleEventActive: false, ambientTemperatureC: -61 },
  { sol: 11, dustOpacityTau: 0.32, solarParticleEventActive: false, ambientTemperatureC: -60 },
  { sol: 12, dustOpacityTau: 0.25, solarParticleEventActive: false, ambientTemperatureC: -59 },
  { sol: 13, dustOpacityTau: 0.22, solarParticleEventActive: false, ambientTemperatureC: -58 },
  { sol: 14, dustOpacityTau: 0.20, solarParticleEventActive: false, ambientTemperatureC: -58 },
];

export const CANONICAL_OUTPOST_SCENARIO: OutpostScenario = {
  id: 'jezero-crisis',
  title: 'Sol 42: The Jezero Outpost Crisis',
  setting: 'mars',
  locationName: 'Jezero Crater Outpost Alpha (18.38°N, 77.58°E)',
  description:
    'A severe regional dust storm reduces surface solar irradiance over 14 Sols while a coronal mass ejection triggers a dangerous Solar Particle Event on Sols 6–8. Balance life support, radiation shielding, and food production to preserve the crew and base.',
  durationSols: 14,
  crewCount: OUTPOST_CREW_COUNT,
  baseNuclearKw: BASELINE_NUCLEAR_KW,
  solarArrayNominalKw: BASELINE_SOLAR_NOMINAL_KW,
  batteryCapacityKwh: BASELINE_BATTERY_CAPACITY_KWH,
  initialBatteryKwh: BASELINE_INITIAL_BATTERY_KWH,
  environmentalSchedule: JEZERO_CRISIS_ENVIRONMENT,
};
