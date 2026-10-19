/**
 * Physical constants used by the simulation core.
 *
 * IMPORTANT (scientific integrity): the values below are recorded from standard
 * published reference values. In this milestone they were NOT re-fetched from a
 * live source and were NOT independently re-derived. Before these values are
 * presented to users as sourced data, re-check them against the specific
 * document cited here and record the retrieval date, per docs/DATA_SOURCES.md.
 */

/**
 * Earth gravitational parameter (GM), km^3/s^2.
 *
 * Value: 398600.4418 km^3/s^2 — the standard geodetic/gravity-model value
 * (WGS-84 / EGM2008 series) and the value normally tabulated for Earth
 * (for example, the "GM (km^3/s^2)" row of the NASA/NSSDC Earth Fact Sheet,
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html).
 *
 * GM is known to much higher precision than G x M computed from a quoted mass,
 * which is why the force model uses GM directly instead of multiplying G by an
 * Earth mass estimate.
 */
export const EARTH_MU_KM3_S2 = 398600.4418;

/**
 * Earth mean (volumetric) radius, km.
 * Used for human-readable labels, default impact-radius stop conditions, and
 * preset construction — never as a substitute for a measured state vector.
 * Reference: NASA/NSSDC Earth Fact Sheet ("Volumetric mean radius").
 */
export const EARTH_MEAN_RADIUS_KM = 6371.0;

/**
 * Newtonian constant of gravitation, converted to km^3 kg^-1 s^-2.
 *
 * CODATA value in SI: 6.67430e-11 m^3 kg^-1 s^-2.
 * Conversion: 1 m^3 = 1e-9 km^3, therefore 6.67430e-11 m^3 kg^-1 s^-2
 * = 6.67430e-20 km^3 kg^-1 s^-2.
 *
 * This constant is NOT used by the two-body force model (which uses GM
 * directly). It exists only so the unit cross-check test can verify that
 * GM = G x M stays dimensionally and numerically consistent.
 */
export const NEWTONIAN_G_KM3_KG_S2 = 6.6743e-20;

/**
 * Earth nominal mass, kg.
 * Reference: NASA/NSSDC Earth Fact Sheet ("Mass"), ~1e-4 relative uncertainty.
 * Cross-check use only; the force model does not use this value.
 */
export const EARTH_MASS_KG = 5.9722e24;
