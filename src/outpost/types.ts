/**
 * Domain types for the Outpost Resource Management simulation.
 *
 * Models a planetary surface outpost (e.g. Mars Jezero Crater or Lunar Base)
 * balancing competing demands among Life Support (ECLSS), Radiation Shielding,
 * Power Generation/Storage, and Food Production.
 *
 * All numerical outputs are deterministic and unit-grounded.
 */

export type SubsystemId = 'lifeSupport' | 'radiationShield' | 'foodProduction' | 'auxiliary';

export interface SubsystemAllocation {
  /** Power allocated to Environmental Control and Life Support System (ECLSS), kW. */
  lifeSupportKw: number;
  /** Power allocated to active electromagnetic storm deflection or shelter life support, kW. */
  radiationShieldKw: number;
  /** Power allocated to hydroponics LED grow lights and fluid circulation, kW. */
  foodProductionKw: number;
  /** Power allocated to base communications, avionics, and core systems, kW. */
  auxiliaryKw: number;
}

export interface DailyEnvironment {
  /** Sol number (1-indexed day of the mission). */
  sol: number;
  /** Atmospheric dust optical depth tau (0.1 = pristine, 0.9 = severe dust storm). */
  dustOpacityTau: number;
  /** Whether a high-energy Solar Particle Event (SPE coronal mass ejection) is active. */
  solarParticleEventActive: boolean;
  /** Diurnal mean surface ambient temperature, degrees Celsius. */
  ambientTemperatureC: number;
}

export type CrewHealthStatus = 'nominal' | 'strained' | 'critical' | 'incapacitated';

export interface OutpostDailySample {
  /** Sol index. */
  sol: number;
  /** Total electrical power generated across all sources, kW. */
  powerGeneratedKw: number;
  /** Solar power contribution, kW. */
  solarGeneratedKw: number;
  /** Fixed nuclear/RTG base generation contribution, kW. */
  nuclearGeneratedKw: number;
  /** Total electrical power consumed by all subsystems, kW. */
  powerConsumedKw: number;
  /** Net electrical power (positive = charging battery, negative = discharging), kW. */
  netPowerKw: number;
  /** Battery energy storage at end of Sol, kWh. */
  batteryStorageKwh: number;
  /** Battery energy capacity, kWh. */
  batteryCapacityKwh: number;
  /** Percentage of battery capacity currently stored (0 - 100%). */
  batteryPercent: number;

  /** Cabin atmospheric oxygen percentage (nominal 20.9%, minimum safe 19.5%). */
  oxygenLevelPercent: number;
  /** Cabin interior temperature, degrees Celsius (nominal 21.0°C). */
  cabinTemperatureC: number;
  /** Radiation dose received on this Sol, millisieverts (mSv). */
  dailyRadiationDoseMsv: number;
  /** Cumulative radiation dose accumulated from mission start to this Sol, mSv. */
  cumulativeRadiationDoseMsv: number;
  /** Viable crop biomass health percentage (100% = flourishing, 0% = dead). */
  cropHealthPercent: number;
  /** Number of consecutive Sols the greenhouse has received zero or sub-critical power. */
  consecutiveCropStarvationSols: number;

  /** Health classification of the 4-person astronaut crew. */
  crewStatus: CrewHealthStatus;
  /** Notable operational events triggered on this Sol. */
  events: string[];
}

export interface OutpostScenario {
  id: string;
  title: string;
  setting: 'mars' | 'moon';
  locationName: string;
  description: string;
  durationSols: number;
  crewCount: number;

  /** Fixed continuous base generation (Kilopower fission reactor or RTG), kW. */
  baseNuclearKw: number;
  /** Maximum unattenuated solar array output at clear noon zenith, kW. */
  solarArrayNominalKw: number;
  /** Energy storage capacity of the main battery bank, kWh. */
  batteryCapacityKwh: number;
  /** Initial battery energy level at Sol 1 start, kWh. */
  initialBatteryKwh: number;

  /** Environmental conditions scheduled for each Sol of the mission. */
  environmentalSchedule: DailyEnvironment[];
}

export interface OutpostRunResult {
  scenario: OutpostScenario;
  allocations: SubsystemAllocation[];
  samples: OutpostDailySample[];
  completed: boolean;
  terminalReason?: string;
}

export type OutpostOutcome = 'PASS' | 'FAIL' | 'NOT_EVALUABLE';

export interface OutpostCriterionResult {
  id: string;
  label: string;
  passed: boolean;
  observedValue: string;
  thresholdValue: string;
  details: string;
}

export interface OutpostEvaluation {
  outcome: OutpostOutcome;
  summary: string;
  criteria: OutpostCriterionResult[];
  maxRadiationDoseMsv: number;
  minOxygenPercent: number;
  minCabinTempC: number;
  finalCropHealthPercent: number;
  finalBatteryPercent: number;
  debriefNotes: string[];
}
