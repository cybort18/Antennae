/**
 * Visual scene coordinate mapping and 3D orbital path geometry.
 *
 * Transforms physical J2000 heliocentric ecliptic coordinates (AU) into Three.js
 * scene units [x, y, z] using a monotonic power-law radial compression:
 *
 *   r_scene = SCALE_K * (r_au)^SCALE_GAMMA
 *
 * Three.js scene coordinates:
 *   +X: Ecliptic X (Vernal Equinox)
 *   +Y: Ecliptic Z (Out-of-plane inclination / celestial north)
 *   +Z: Ecliptic Y (In-plane 90-degree longitude)
 */

import { computeOrbitalState } from './keplerSolver';
import type { SolarSystemBodyId } from '../bodies';

/** Earth display radius at 1.0 AU in scene units (anchored to legacy scene scale). */
export const SCALE_K = 6.9;

/** Power-law exponent for radial compression. */
export const SCALE_GAMMA = 0.6;

/**
 * Transforms a physical position in AU [X, Y, Z]_ecliptic into Three.js scene coordinates [x, y, z].
 */
export function heliocentricAuToScene(positionAu: [number, number, number]): [number, number, number] {
  const [X, Y, Z] = positionAu;
  const rAu = Math.hypot(X, Y, Z);

  if (rAu < 1e-9) {
    return [0, 0, 0];
  }

  const rScene = SCALE_K * Math.pow(rAu, SCALE_GAMMA);
  const factor = rScene / rAu;

  // Three.js convention: X is X, Y is Z (up), Z is Y
  const sceneX = X * factor;
  const sceneY = Z * factor;
  const sceneZ = Y * factor;

  return [sceneX, sceneY, sceneZ];
}

/**
 * Generates an array of 3D scene points [x, y, z] tracing the complete orbital ellipse of a body.
 * For the central Sun, returns empty array.
 */
export function generateOrbitPathScenePoints(
  bodyId: SolarSystemBodyId,
  jd: number,
  segments = 128,
): Array<[number, number, number]> {
  if (bodyId === 'sun') {
    return [];
  }

  const state = computeOrbitalState(bodyId, jd);
  const { semiMajorAxisAu: a, eccentricity: e, inclinationDeg, longitudeOfAscendingNodeDeg, argumentOfPerihelionDeg } =
    state.elements;

  const incRad = (inclinationDeg * Math.PI) / 180;
  const nodeRad = (longitudeOfAscendingNodeDeg * Math.PI) / 180;
  const omegaRad = (argumentOfPerihelionDeg * Math.PI) / 180;

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

  const points: Array<[number, number, number]> = [];

  for (let index = 0; index <= segments; index += 1) {
    const E = (index / segments) * 2 * Math.PI;
    const xOrb = a * (Math.cos(E) - e);
    const yOrb = a * Math.sqrt(Math.max(1 - e * e, 0)) * Math.sin(E);

    const X = Px * xOrb + Qx * yOrb;
    const Y = Py * xOrb + Qy * yOrb;
    const Z = Pz * xOrb + Qz * yOrb;

    points.push(heliocentricAuToScene([X, Y, Z]));
  }

  return points;
}
