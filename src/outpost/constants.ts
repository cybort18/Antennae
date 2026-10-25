/**
 * Physical constants, baseline consumption figures, and NASA guideline thresholds
 * for the Outpost Resource Management simulation.
 *
 * Sources:
 * - NASA Human Integration Design Handbook (HIDH) - ECLSS standards & metabolic consumption.
 * - NASA Mars Design Reference Architecture 5.0 (DRA 5.0) - Kilopower & PV array specs.
 * - Curiosity RAD (Radiation Assessment Detector) surface data - Mars background radiation.
 * - NASA Space Apps 2026: Build a Junior Astronaut Mission Trainer parameters.
 */

/** Mars mean solar day duration in Earth hours (24h 37m 22s). */
export const MARS_SOL_HOURS = 24.6229;

/** Default crew complement for the training outpost slice. */
export const OUTPOST_CREW_COUNT = 4;

/* ------------------------------------------------------------------ Power */

/** Fixed continuous power output from surface Kilopower nuclear reactor, kW. */
export const BASELINE_NUCLEAR_KW = 10.0;

/** Nominal clear-sky peak power from surface deployable solar array, kW. */
export const BASELINE_SOLAR_NOMINAL_KW = 40.0;

/** Default main battery energy storage capacity, kWh. */
export const BASELINE_BATTERY_CAPACITY_KWH = 240.0;

/** Default starting battery charge at mission onset, kWh (100% capacity). */
export const BASELINE_INITIAL_BATTERY_KWH = 240.0;

/* -------------------------------------------------------- Subsystem Needs */

/** Minimum power required for nominal 4-person ECLSS operation, kW. */
export const ECLSS_NOMINAL_POWER_KW = 16.0;

/** Absolute minimum survival power for ECLSS before oxygen/thermal collapse, kW. */
export const ECLSS_MIN_SURVIVAL_POWER_KW = 9.0;

/** Power required to maintain full electromagnetic deflection or storm shelter life support, kW. */
export const SHIELD_NOMINAL_POWER_KW = 12.0;

/** Power required for nominal hydroponic greenhouse grow lights and water pumps, kW. */
export const FOOD_NOMINAL_POWER_KW = 14.0;

/** Minimum power required to prevent greenhouse freezing/blight, kW. */
export const FOOD_MIN_SURVIVAL_POWER_KW = 4.0;

/** Baseline auxiliary avionics, base telemetry, and ground comms power, kW. */
export const AUXILIARY_NOMINAL_POWER_KW = 4.0;

/** Sum of all subsystem power at 100% nominal operation, kW. */
export const TOTAL_NOMINAL_CONSUMPTION_KW =
  ECLSS_NOMINAL_POWER_KW +
  SHIELD_NOMINAL_POWER_KW +
  FOOD_NOMINAL_POWER_KW +
  AUXILIARY_NOMINAL_POWER_KW; // 46.0 kW

/* --------------------------------------------------- Biological & Physics */

/** Nominal cabin oxygen percentage in Martian habitat atmospheric mix. */
export const OXYGEN_NOMINAL_PERCENT = 20.9;

/** Minimum acceptable oxygen percentage before hypoxia symptoms manifest. */
export const OXYGEN_SAFE_MIN_PERCENT = 19.5;

/** Critical oxygen percentage below which crew becomes incapacitated. */
export const OXYGEN_CRITICAL_PERCENT = 18.0;

/** Nominal internal habitat temperature, degrees Celsius. */
export const CABIN_TEMP_NOMINAL_C = 21.0;

/** Safe minimum internal habitat temperature, degrees Celsius. */
export const CABIN_TEMP_SAFE_MIN_C = 16.0;

/** Critical hypothermia threshold for internal habitat temperature, degrees Celsius. */
export const CABIN_TEMP_CRITICAL_C = 10.0;

/** Background galactic cosmic ray (GCR) surface radiation on Mars, mSv/sol. */
export const MARS_SURFACE_BACKGROUND_RADIATION_MSV_SOL = 0.65;

/** Unshielded radiation dose rate during a coronal mass ejection / Solar Particle Event, mSv/sol. */
export const SPE_UNSHIELDED_RADIATION_MSV_SOL = 42.0;

/** Residual shielded radiation dose rate during SPE when shield is fully powered, mSv/sol. */
export const SPE_SHIELDED_RADIATION_MSV_SOL = 1.2;

/** Maximum allowable cumulative mission radiation for Junior Astronaut pass certification, mSv. */
export const CADET_MAX_RADIATION_DOSE_MSV = 40.0;

/** Critical radiation sickness threshold, mSv. */
export const CRITICAL_RADIATION_DOSE_MSV = 80.0;

/** Number of consecutive starvation sols after which crops suffer irreversible blight. */
export const CROP_STARVATION_DEATH_SOLS = 3;

/** Minimum crop biomass survival rate for food security pass, percent. */
export const MIN_PASSING_CROP_HEALTH_PERCENT = 40.0;
