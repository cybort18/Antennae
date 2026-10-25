/**
 * Astronomy data types and contracts for Keplerian ephemeris computation.
 *
 * All physical distances in this module are in Astronomical Units (AU) or
 * kilometres (km), angles are in degrees or radians, and velocities are in km/s.
 * The coordinate frame is the J2000 Heliocentric Ecliptic frame.
 */

import type { SolarSystemBodyId } from '../bodies';

export type KeplerianElements = {
  /** Semi-major axis in Astronomical Units (AU). */
  semiMajorAxisAu: number;
  /** Dimensionless orbital eccentricity. */
  eccentricity: number;
  /** Orbital inclination to the J2000 ecliptic in degrees. */
  inclinationDeg: number;
  /** Mean longitude in degrees. */
  meanLongitudeDeg: number;
  /** Longitude of perihelion in degrees (\u03d6 = \u03a9 + \u03c9). */
  longitudeOfPerihelionDeg: number;
  /** Longitude of ascending node in degrees (\u03a9). */
  longitudeOfAscendingNodeDeg: number;
  /** Argument of perihelion in degrees (\u03c9 = \u03d6 - \u03a9). */
  argumentOfPerihelionDeg: number;
  /** Mean anomaly in degrees (M = L - \u03d6). */
  meanAnomalyDeg: number;
};

export type BodyOrbitalState = {
  bodyId: SolarSystemBodyId;
  julianDate: number;
  /** Heliocentric position in J2000 ecliptic coordinates [X, Y, Z] in AU. */
  positionAu: [number, number, number];
  /** Heliocentric position in kilometres (1 AU = 149,597,870.7 km). */
  positionKm: [number, number, number];
  /** Radial distance from Sun in AU. */
  distanceAu: number;
  /** Radial distance from Sun in km. */
  distanceKm: number;
  /** Orbital speed in km/s relative to the Sun. */
  speedKmS: number;
  /** True anomaly in degrees (\u03bd \u2208 [-180, 180]). */
  trueAnomalyDeg: number;
  /** Ecliptic longitude in degrees (\u03bb \u2208 [0, 360)). */
  eclipticLongitudeDeg: number;
  /** Ecliptic latitude in degrees (\u03b2). */
  eclipticLatitudeDeg: number;
  /** Calculated Keplerian elements at the query date. */
  elements: KeplerianElements;
};

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};
