/**
 * Standish (1992) Table 1 Keplerian parameters and rates for planets,
 * plus JPL SBDB Solution 118 elements for Asteroid 101955 Bennu.
 *
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * Source for Bennu: https://ssd-api.jpl.nasa.gov/doc/sbdb.html
 */

import type { KeplerianElements } from './types';
import type { SolarSystemBodyId } from '../bodies';

export type StandishCoefficients = {
  a0: number; // AU
  aDot: number; // AU / century
  e0: number; // dimensionless
  eDot: number; // / century
  I0: number; // deg
  IDot: number; // deg / century
  L0: number; // deg
  LDot: number; // deg / century
  longPeri0: number; // deg
  longPeriDot: number; // deg / century
  node0: number; // deg
  nodeDot: number; // deg / century
};

export const STANDISH_TABLE_1: Record<
  Exclude<SolarSystemBodyId, 'sun' | 'bennu'>,
  StandishCoefficients
> = {
  mercury: {
    a0: 0.38709927,
    aDot: 0.00000037,
    e0: 0.20563593,
    eDot: 0.00001906,
    I0: 7.00497902,
    IDot: -0.00594749,
    L0: 252.2503235,
    LDot: 149472.67411175,
    longPeri0: 77.45779628,
    longPeriDot: 0.16047689,
    node0: 48.33076593,
    nodeDot: -0.12534081,
  },
  venus: {
    a0: 0.72333566,
    aDot: 0.0000039,
    e0: 0.00677672,
    eDot: -0.00004107,
    I0: 3.39467605,
    IDot: -0.0007889,
    L0: 181.9790995,
    LDot: 58517.81538729,
    longPeri0: 131.60246718,
    longPeriDot: 0.00268329,
    node0: 76.67984255,
    nodeDot: -0.27769418,
  },
  earth: {
    // Earth-Moon Barycenter from Standish Table 1
    a0: 1.00000261,
    aDot: 0.00000562,
    e0: 0.01671123,
    eDot: -0.00004392,
    I0: -0.00001531,
    IDot: -0.01294668,
    L0: 100.46457166,
    LDot: 35999.37244981,
    longPeri0: 102.93768193,
    longPeriDot: 0.32327364,
    node0: 0.0,
    nodeDot: 0.0,
  },
  mars: {
    a0: 1.52371034,
    aDot: 0.00001847,
    e0: 0.0933941,
    eDot: 0.00007882,
    I0: 1.84969142,
    IDot: -0.00813131,
    L0: -4.55343205,
    LDot: 19140.30268499,
    longPeri0: -23.94362959,
    longPeriDot: 0.44441088,
    node0: 49.55953891,
    nodeDot: -0.29257343,
  },
  jupiter: {
    a0: 5.202887,
    aDot: -0.00011607,
    e0: 0.04838624,
    eDot: -0.00013253,
    I0: 1.30439695,
    IDot: -0.00183714,
    L0: 34.39644051,
    LDot: 3034.74612775,
    longPeri0: 14.72847983,
    longPeriDot: 0.21252668,
    node0: 100.47390909,
    nodeDot: 0.20469106,
  },
  saturn: {
    a0: 9.53667594,
    aDot: -0.0012506,
    e0: 0.05386179,
    eDot: -0.00050991,
    I0: 2.48599187,
    IDot: 0.00193609,
    L0: 49.95424423,
    LDot: 1222.49362201,
    longPeri0: 92.59887831,
    longPeriDot: -0.41897216,
    node0: 113.66242448,
    nodeDot: -0.28867794,
  },
  uranus: {
    a0: 19.18916464,
    aDot: -0.0019615,
    e0: 0.04725744,
    eDot: -0.00004397,
    I0: 0.77263783,
    IDot: -0.00242939,
    L0: 313.23810451,
    LDot: 428.48202785,
    longPeri0: 170.9542763,
    longPeriDot: 0.4080528,
    node0: 74.01692503,
    nodeDot: 0.04240589,
  },
  neptune: {
    a0: 30.06992276,
    aDot: 0.00026291,
    e0: 0.0086061,
    eDot: 0.00005105,
    I0: 1.77004347,
    IDot: 0.00035372,
    L0: -55.12002969,
    LDot: 218.45945325,
    longPeri0: 44.96476227,
    longPeriDot: -0.32241464,
    node0: 131.78422574,
    nodeDot: -0.00508664,
  },
};

/**
 * Normalizes an angle in degrees into [-180, 180].
 */
export function normalizeAngle180(degrees: number): number {
  let angle = degrees % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
}

/**
 * Normalizes an angle in degrees into [0, 360).
 */
export function normalizeAngle360(degrees: number): number {
  let angle = degrees % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Evaluates Keplerian orbital elements for a planet at Julian centuries T.
 */
export function getPlanetKeplerianElements(
  planetId: Exclude<SolarSystemBodyId, 'sun' | 'bennu'>,
  T: number,
): KeplerianElements {
  const c = STANDISH_TABLE_1[planetId];

  const semiMajorAxisAu = c.a0 + c.aDot * T;
  const eccentricity = c.e0 + c.eDot * T;
  const inclinationDeg = c.I0 + c.IDot * T;
  const meanLongitudeDeg = normalizeAngle360(c.L0 + c.LDot * T);
  const longitudeOfPerihelionDeg = normalizeAngle360(c.longPeri0 + c.longPeriDot * T);
  const longitudeOfAscendingNodeDeg = normalizeAngle360(c.node0 + c.nodeDot * T);

  const argumentOfPerihelionDeg = normalizeAngle360(
    longitudeOfPerihelionDeg - longitudeOfAscendingNodeDeg,
  );
  const meanAnomalyDeg = normalizeAngle180(meanLongitudeDeg - longitudeOfPerihelionDeg);

  return {
    semiMajorAxisAu,
    eccentricity,
    inclinationDeg,
    meanLongitudeDeg,
    longitudeOfPerihelionDeg,
    longitudeOfAscendingNodeDeg,
    argumentOfPerihelionDeg,
    meanAnomalyDeg,
  };
}

/**
 * Evaluates Keplerian orbital elements for Asteroid 101955 Bennu at Julian Date jd.
 * Sourced from JPL SBDB Orbit Solution 118 (Epoch JD 2455562.5 / 2011-Jan-01.0 TDB).
 */
export function getBennuKeplerianElements(jd: number): KeplerianElements {
  const epochJd = 2455562.5;
  const a = 1.126391025894812;
  const e = 0.2037450762416414;
  const inc = 6.03494377024794;
  const node = 2.060866129864019;
  const omega = 66.22306077598688;
  const m0 = 101.7039016911681;
  const periodDays = 436.6487281120201;

  const meanMotionDegPerDay = 360.0 / periodDays;
  const deltaDays = jd - epochJd;
  const meanAnomalyDeg = normalizeAngle180(m0 + meanMotionDegPerDay * deltaDays);

  const longPeriDeg = normalizeAngle360(node + omega);
  const meanLongitudeDeg = normalizeAngle360(longPeriDeg + meanAnomalyDeg);

  return {
    semiMajorAxisAu: a,
    eccentricity: e,
    inclinationDeg: inc,
    meanLongitudeDeg,
    longitudeOfPerihelionDeg: longPeriDeg,
    longitudeOfAscendingNodeDeg: node,
    argumentOfPerihelionDeg: omega,
    meanAnomalyDeg,
  };
}
