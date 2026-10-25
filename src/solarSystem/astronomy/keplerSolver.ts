/**
 * Kepler's Equation solver and 3D heliocentric ecliptic position calculator.
 *
 * Implements Newton-Raphson iteration for Eccentric Anomaly and transformation
 * from the orbital plane to the J2000 Heliocentric Ecliptic frame.
 */

import { KM_PER_AU, julianCenturiesSinceJ2000 } from './julianDate';
import {
  getBennuKeplerianElements,
  getPlanetKeplerianElements,
  normalizeAngle180,
  normalizeAngle360,
} from './standishElements';
import type { BodyOrbitalState, KeplerianElements } from './types';
import type { SolarSystemBodyId } from '../bodies';

/** Heliocentric gravitational parameter GM_sun in km^3/s^2 (IAU 2015). */
export const GM_SUN_KM3_S2 = 1.32712440018e11;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Solves Kepler's Equation M = E - e * sin(E) for Eccentric Anomaly E (in radians).
 * Uses Newton-Raphson iteration with machine-precision tolerance.
 */
export function solveKeplerEquation(meanAnomalyRad: number, eccentricity: number): number {
  const e = Math.min(Math.max(eccentricity, 0), 0.999);
  let M = meanAnomalyRad % (2 * Math.PI);
  if (M < -Math.PI) M += 2 * Math.PI;
  if (M > Math.PI) M -= 2 * Math.PI;

  // Good initial approximation for moderate eccentricities (Danby)
  let E = M + e * Math.sin(M);

  for (let iter = 0; iter < 10; iter += 1) {
    const f = E - e * Math.sin(E) - M;
    const fPrime = 1 - e * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < 1e-12) {
      break;
    }
  }

  return E;
}

/**
 * Computes the complete orbital state for a Solar System body at Julian Date jd.
 * For the central Sun, returns origin [0, 0, 0] with zero velocity.
 */
export function computeOrbitalState(bodyId: SolarSystemBodyId, jd: number): BodyOrbitalState {
  if (bodyId === 'sun') {
    return {
      bodyId: 'sun',
      julianDate: jd,
      positionAu: [0, 0, 0],
      positionKm: [0, 0, 0],
      distanceAu: 0,
      distanceKm: 0,
      speedKmS: 0,
      trueAnomalyDeg: 0,
      eclipticLongitudeDeg: 0,
      eclipticLatitudeDeg: 0,
      elements: {
        semiMajorAxisAu: 0,
        eccentricity: 0,
        inclinationDeg: 0,
        meanLongitudeDeg: 0,
        longitudeOfPerihelionDeg: 0,
        longitudeOfAscendingNodeDeg: 0,
        argumentOfPerihelionDeg: 0,
        meanAnomalyDeg: 0,
      },
    };
  }

  let elements: KeplerianElements;
  if (bodyId === 'bennu') {
    elements = getBennuKeplerianElements(jd);
  } else {
    const T = julianCenturiesSinceJ2000(jd);
    elements = getPlanetKeplerianElements(bodyId, T);
  }

  const {
    semiMajorAxisAu: a,
    eccentricity: e,
    inclinationDeg: incDeg,
    longitudeOfAscendingNodeDeg: nodeDeg,
    argumentOfPerihelionDeg: omegaDeg,
    meanAnomalyDeg: mDeg,
  } = elements;

  const mRad = mDeg * DEG_TO_RAD;
  const incRad = incDeg * DEG_TO_RAD;
  const nodeRad = nodeDeg * DEG_TO_RAD;
  const omegaRad = omegaDeg * DEG_TO_RAD;

  // 1. Solve for Eccentric Anomaly E
  const E = solveKeplerEquation(mRad, e);

  // 2. Position in the orbital plane
  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(Math.max(1 - e * e, 0)) * Math.sin(E);

  // 3. Radial distance in AU and km
  const rAu = Math.hypot(xOrb, yOrb);
  const rKm = rAu * KM_PER_AU;
  const aKm = a * KM_PER_AU;

  // 4. True Anomaly \nu
  const trueAnomalyRad = Math.atan2(yOrb, xOrb);
  const trueAnomalyDeg = normalizeAngle180(trueAnomalyRad * RAD_TO_DEG);

  // 5. Transform from orbital plane coordinates [xOrb, yOrb, 0] to J2000 Ecliptic [X, Y, Z]
  const cosNode = Math.cos(nodeRad);
  const sinNode = Math.sin(nodeRad);
  const cosOmega = Math.cos(omegaRad);
  const sinOmega = Math.sin(omegaRad);
  const cosInc = Math.cos(incRad);
  const sinInc = Math.sin(incRad);

  const Px = cosOmega * cosNode - sinOmega * sinNode * cosInc;
  const Py = cosOmega * sinNode + sinOmega * cosNode * cosInc;
  const Pz = sinOmega * sinInc;

  const Qx = -sinOmega * cosNode - cosOmega * sinNode * cosInc;
  const Qy = -sinOmega * sinNode + cosOmega * cosNode * cosInc;
  const Qz = cosOmega * sinInc;

  const X = Px * xOrb + Qx * yOrb;
  const Y = Py * xOrb + Qy * yOrb;
  const Z = Pz * xOrb + Qz * yOrb;

  const positionAu: [number, number, number] = [X, Y, Z];
  const positionKm: [number, number, number] = [X * KM_PER_AU, Y * KM_PER_AU, Z * KM_PER_AU];

  // 6. Ecliptic longitude \lambda and latitude \beta
  const eclipticLongitudeDeg = normalizeAngle360(Math.atan2(Y, X) * RAD_TO_DEG);
  const eclipticLatitudeDeg = Math.asin(Math.max(-1, Math.min(1, Z / rAu))) * RAD_TO_DEG;

  // 7. Vis-viva speed v = sqrt(GM * (2/r - 1/a)) in km/s
  const speedKmS = Math.sqrt(Math.max(0, GM_SUN_KM3_S2 * (2 / rKm - 1 / aKm)));

  return {
    bodyId,
    julianDate: jd,
    positionAu,
    positionKm,
    distanceAu: rAu,
    distanceKm: rKm,
    speedKmS,
    trueAnomalyDeg,
    eclipticLongitudeDeg,
    eclipticLatitudeDeg,
    elements,
  };
}
