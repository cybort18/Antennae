/**
 * Scenario definitions for the Junior Astronaut Outpost Trainer.
 *
 * Provides two authentic NASA exploration settings:
 * 1. Mars Jezero Crater ("Sol 42 Crisis"): 14-Sol dust storm with SPE flare.
 * 2. Moon Shackleton Crater Rim ("The Shackleton Endurance"): 14-day lunar polar
 *    night with zero atmospheric radiation shielding and 7-day shadow phase.
 */

import {
  BASELINE_BATTERY_CAPACITY_KWH,
  BASELINE_INITIAL_BATTERY_KWH,
  BASELINE_NUCLEAR_KW,
  BASELINE_SOLAR_NOMINAL_KW,
  MOON_BASELINE_BATTERY_CAPACITY_KWH,
  MOON_BASELINE_NUCLEAR_KW,
  OUTPOST_CREW_COUNT,
} from './constants';
import type { DailyEnvironment, IncidentDilemma, OutpostScenario } from './types';

/* ----------------------------------------------------------- Mars Scenarios */

/**
 * 14-Sol environmental schedule for the canonical Mars challenge.
 */
export const JEZERO_CRISIS_ENVIRONMENT: DailyEnvironment[] = [
  { sol: 1, dustOpacityTau: 0.18, solarParticleEventActive: false, ambientTemperatureC: -58, solarInsolationFraction: 1.0 },
  { sol: 2, dustOpacityTau: 0.20, solarParticleEventActive: false, ambientTemperatureC: -59, solarInsolationFraction: 1.0 },
  { sol: 3, dustOpacityTau: 0.24, solarParticleEventActive: false, ambientTemperatureC: -60, solarInsolationFraction: 1.0 },
  { sol: 4, dustOpacityTau: 0.52, solarParticleEventActive: false, ambientTemperatureC: -62, solarInsolationFraction: 1.0 },
  { sol: 5, dustOpacityTau: 0.76, solarParticleEventActive: false, ambientTemperatureC: -65, solarInsolationFraction: 1.0 },
  // Solar flare event occurs during peak dust storm:
  { sol: 6, dustOpacityTau: 0.88, solarParticleEventActive: true, ambientTemperatureC: -68, solarInsolationFraction: 1.0 },
  { sol: 7, dustOpacityTau: 0.85, solarParticleEventActive: true, ambientTemperatureC: -67, solarInsolationFraction: 1.0 },
  { sol: 8, dustOpacityTau: 0.78, solarParticleEventActive: true, ambientTemperatureC: -65, solarInsolationFraction: 1.0 },
  // Storm settling:
  { sol: 9, dustOpacityTau: 0.58, solarParticleEventActive: false, ambientTemperatureC: -63, solarInsolationFraction: 1.0 },
  { sol: 10, dustOpacityTau: 0.42, solarParticleEventActive: false, ambientTemperatureC: -61, solarInsolationFraction: 1.0 },
  { sol: 11, dustOpacityTau: 0.32, solarParticleEventActive: false, ambientTemperatureC: -60, solarInsolationFraction: 1.0 },
  { sol: 12, dustOpacityTau: 0.25, solarParticleEventActive: false, ambientTemperatureC: -59, solarInsolationFraction: 1.0 },
  { sol: 13, dustOpacityTau: 0.22, solarParticleEventActive: false, ambientTemperatureC: -58, solarInsolationFraction: 1.0 },
  { sol: 14, dustOpacityTau: 0.20, solarParticleEventActive: false, ambientTemperatureC: -58, solarInsolationFraction: 1.0 },
];

export const JEZERO_DILEMMAS: IncidentDilemma[] = [
  {
    id: 'jezero-dust-buildup',
    sol: 5,
    title: 'Solar Array Dust Encrustation Alert',
    threatType: 'dust',
    briefing:
      'Fine electrostatic ferric dust is coating the main photovoltaic panels ahead of peak storm conditions. Without action, solar output will degrade by 35%.',
    options: [
      {
        id: 'eva-sweep',
        label: 'Deploy 2 Astronauts for Rapid EVA Sweep',
        description: 'Astronauts execute a manual wipe with electrostatic brooms to restore full clean-panel efficiency.',
        costDescription: '+10.0 mSv radiation dose to crew, cleans panels effectively.',
        applyEffect: (sample) => ({
          samplePatch: {
            cumulativeRadiationDoseMsv: sample.cumulativeRadiationDoseMsv + 10.0,
            events: [...sample.events, 'DILEMMA_EVA_SWEEP_EXECUTED'],
          },
          eventLog: 'EVA completed: panels cleaned; crew absorbed +10.0 mSv radiation.',
        }),
      },
      {
        id: 'piezo-shakers',
        label: 'Fire Internal Piezo-Electric Shakers',
        description: 'Vibrate the array mechanically from base power without exposing astronauts outside.',
        costDescription: '-22.0 kWh battery storage drain, 0 mSv crew exposure.',
        applyEffect: (sample) => ({
          samplePatch: {
            batteryStorageKwh: Math.max(0, sample.batteryStorageKwh - 22.0),
            events: [...sample.events, 'DILEMMA_PIEZO_SHAKERS_FIRED'],
          },
          eventLog: 'Piezo vibrators cleared dust; battery drained by -22.0 kWh.',
        }),
      },
    ],
  },
  {
    id: 'jezero-greenhouse-crisis',
    sol: 7,
    title: 'SPE Solar Flare & Hydroponics Coolant Rupture',
    threatType: 'radiation',
    briefing:
      'During the height of the solar particle event on Sol 7, secondary thermal plumbing in Hydroponics Pod B develops a cryogenic freeze leak.',
    options: [
      {
        id: 'isolate-pod-b',
        label: 'Isolate Pod B & Conserve Life Support',
        description: 'Seal off Pod B to ensure primary habitat ECLSS pressure and crew safety are never compromised.',
        costDescription: '-22.0% crop biomass loss, crew remains fully protected.',
        applyEffect: (sample) => ({
          samplePatch: {
            cropHealthPercent: Math.max(0, sample.cropHealthPercent - 22.0),
            events: [...sample.events, 'DILEMMA_POD_B_ISOLATED'],
          },
          eventLog: 'Pod B sealed: -22.0% crop biomass lost to protect habitat pressure.',
        }),
      },
      {
        id: 'thermal-induction-pulse',
        label: 'Pulse Battery-Driven Thermal Induction',
        description: 'Direct emergency battery current into fluid lines to melt ice blockages and save seedlings.',
        costDescription: '-18.0 kWh battery storage, preserves full crop biomass.',
        applyEffect: (sample) => ({
          samplePatch: {
            batteryStorageKwh: Math.max(0, sample.batteryStorageKwh - 18.0),
            events: [...sample.events, 'DILEMMA_THERMAL_INDUCTION_ENGAGED'],
          },
          eventLog: 'Thermal induction pulsed: seedlings saved; battery drained by -18.0 kWh.',
        }),
      },
    ],
  },
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
  dilemmas: JEZERO_DILEMMAS,
};

/* ----------------------------------------------------------- Moon Scenarios */

/**
 * 14-Day lunar polar cycle at the Moon's South Pole.
 *
 * Sols 1-3: Sunlit crater ridge (full sunlight, insolation 1.0).
 * Sols 4-10: Deep Crater Shadow / Lunar Night (insolation 0.0, -130°C).
 * Sols 7-8: Solar Particle Event flare occurs while in darkness.
 * Sols 11-14: Sunlit ridge returns (insolation 1.0).
 */
export const SHACKLETON_ENVIRONMENT: DailyEnvironment[] = [
  { sol: 1, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -55, solarInsolationFraction: 1.0 },
  { sol: 2, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -58, solarInsolationFraction: 1.0 },
  { sol: 3, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -62, solarInsolationFraction: 0.8 },
  // 7-day shadow phase (Lunar Night):
  { sol: 4, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -125, solarInsolationFraction: 0.0 },
  { sol: 5, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -130, solarInsolationFraction: 0.0 },
  { sol: 6, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -132, solarInsolationFraction: 0.0 },
  // Solar flare strikes in vacuum:
  { sol: 7, dustOpacityTau: 0.0, solarParticleEventActive: true, ambientTemperatureC: -132, solarInsolationFraction: 0.0 },
  { sol: 8, dustOpacityTau: 0.0, solarParticleEventActive: true, ambientTemperatureC: -130, solarInsolationFraction: 0.0 },
  { sol: 9, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -128, solarInsolationFraction: 0.0 },
  { sol: 10, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -120, solarInsolationFraction: 0.0 },
  // Sunlit rim returns:
  { sol: 11, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -75, solarInsolationFraction: 0.7 },
  { sol: 12, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -60, solarInsolationFraction: 1.0 },
  { sol: 13, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -55, solarInsolationFraction: 1.0 },
  { sol: 14, dustOpacityTau: 0.0, solarParticleEventActive: false, ambientTemperatureC: -55, solarInsolationFraction: 1.0 },
];

export const SHACKLETON_DILEMMAS: IncidentDilemma[] = [
  {
    id: 'shackleton-night-thermal',
    sol: 4,
    title: 'Lunar Polar Shadow Cryogenic Lock',
    threatType: 'power',
    briefing:
      'Shackleton Rim passes into crater shadow. Surface temperature drops to -125°C and solar towers produce 0 kW. Base must survive 7 days on Kilopower and battery storage.',
    options: [
      {
        id: 'throttle-cabin-temp',
        label: 'Throttle Habitat Temperature to 17.0°C',
        description: 'Lower ECLSS thermal setpoint and wear thermal flight suits to conserve 35.0 kWh of battery storage.',
        costDescription: 'Crew status strained from chill, saves 35.0 kWh battery.',
        applyEffect: (sample) => ({
          samplePatch: {
            cabinTemperatureC: Math.max(16.0, sample.cabinTemperatureC - 2.5),
            crewStatus: 'strained',
            events: [...sample.events, 'DILEMMA_CABIN_TEMP_THROTTLED'],
          },
          eventLog: 'ECLSS throttled to save power; crew strained by cool cabin (17°C).',
        }),
      },
      {
        id: 'full-comfort-draw',
        label: 'Maintain Full 21.0°C Habitat Heating',
        description: 'Keep internal heaters operating at peak nominal comfort throughout the shadow onset.',
        costDescription: '-42.0 kWh battery storage, maintains optimal crew health.',
        applyEffect: (sample) => ({
          samplePatch: {
            batteryStorageKwh: Math.max(0, sample.batteryStorageKwh - 42.0),
            events: [...sample.events, 'DILEMMA_FULL_HEAT_MAINTAINED'],
          },
          eventLog: 'Full heating maintained: -42.0 kWh consumed from battery.',
        }),
      },
    ],
  },
  {
    id: 'shackleton-micrometeoroid-breach',
    sol: 8,
    title: 'Micrometeoroid Threat & Solar Flare',
    threatType: 'micrometeoroid',
    briefing:
      'A high-velocity micrometeoroid shower peppers the southern rim while a Solar Particle Event is active. Habitat magnetic deflection array requires emergency boost.',
    options: [
      {
        id: 'coil-overcharge',
        label: 'Overcharge Magnetic Coils with Battery Reserve',
        description: 'Divert emergency current into active magnetic deflector to shield the crew from cosmic radiation.',
        costDescription: '-32.0 kWh battery drain, crew remains safely shielded.',
        applyEffect: (sample) => ({
          samplePatch: {
            batteryStorageKwh: Math.max(0, sample.batteryStorageKwh - 32.0),
            events: [...sample.events, 'DILEMMA_COILS_OVERCHARGED'],
          },
          eventLog: 'Coils overcharged: radiation deflected; battery drained by -32.0 kWh.',
        }),
      },
      {
        id: 'retreat-lava-tube',
        label: 'Retreat Crew to Subsurface Regolith Tube',
        description: 'Evacuate crew into the natural lava tube shelter and power down surface hydroponics for 24 hours.',
        costDescription: '-18.0% crop biomass loss, zero battery drain.',
        applyEffect: (sample) => ({
          samplePatch: {
            cropHealthPercent: Math.max(0, sample.cropHealthPercent - 18.0),
            events: [...sample.events, 'DILEMMA_CREW_SHELTERED_TUBE'],
          },
          eventLog: 'Crew sheltered underground: 0 battery cost, -18.0% crop biomass lost.',
        }),
      },
    ],
  },
];

export const SHACKLETON_LUNAR_SCENARIO: OutpostScenario = {
  id: 'shackleton-endurance',
  title: 'Artemis Base Camp: The Shackleton Endurance',
  setting: 'moon',
  locationName: 'Shackleton Crater Rim Alpha (89.9°S, 0.0°E)',
  description:
    'Command NASA Artemis Base Camp at the Lunar South Pole through 14 lunar cycles. A 7-day shadow phase cuts solar power to zero in deep cryogenic darkness (-130°C) with no atmospheric radiation shielding. Ration Kilopower nuclear and battery reserves.',
  durationSols: 14,
  crewCount: OUTPOST_CREW_COUNT,
  baseNuclearKw: MOON_BASELINE_NUCLEAR_KW, // 35.0 kW
  solarArrayNominalKw: 32.0,
  batteryCapacityKwh: MOON_BASELINE_BATTERY_CAPACITY_KWH, // 480.0 kWh
  initialBatteryKwh: MOON_BASELINE_BATTERY_CAPACITY_KWH,
  environmentalSchedule: SHACKLETON_ENVIRONMENT,
  dilemmas: SHACKLETON_DILEMMAS,
};

export const AVAILABLE_OUTPOST_SCENARIOS: OutpostScenario[] = [
  CANONICAL_OUTPOST_SCENARIO,
  SHACKLETON_LUNAR_SCENARIO,
];

export function outpostScenarioById(id: string): OutpostScenario {
  return AVAILABLE_OUTPOST_SCENARIOS.find((sc) => sc.id === id) ?? CANONICAL_OUTPOST_SCENARIO;
}
