/**
 * Pure, period-proportional schematic motion helpers for the Solar System Overview.
 *
 * This module is strictly display-only and independent of `src/simulation/`.
 * It advances each planet along its compressed schematic circle (`orbitRadius`)
 * from its static composition angle (`phaseRadians`) at an angular rate
 * inversely proportional to its sourced sidereal orbital period:
 *
 *   theta_i(days) = phaseRadians_i + 2 * PI * elapsedDays / siderealOrbitPeriodDays_i
 *
 * The Sun remains fixed at the origin. Positions are illustrative and do not
 * represent a dated ephemeris or heliocentric dynamics simulation.
 */

import {
  bodyById,
  bodyPosition,
  bodyPositionAtDays,
  type SolarSystemBodyId,
} from './bodies';

export const SCHEMATIC_DURATION_MAX_DAYS = 3650;
export const SCHEMATIC_STEP_DAYS = 10;
export const SCHEMATIC_RATE_OPTIONS = [1, 10, 30, 365] as const;
export type SchematicPlaybackRate = (typeof SCHEMATIC_RATE_OPTIONS)[number];
export const DEFAULT_SCHEMATIC_RATE: SchematicPlaybackRate = 1;

/**
 * Longest real-time delta applied in a single animation frame so a backgrounded
 * tab slows playback down instead of jumping ahead.
 */
export const MAX_SCHEMATIC_FRAME_DELTA_SECONDS = 0.25;

export function clampSchematicDays(elapsedDays: number): number {
  if (!Number.isFinite(elapsedDays)) {
    return 0;
  }
  return Math.min(Math.max(elapsedDays, 0), SCHEMATIC_DURATION_MAX_DAYS);
}

/**
 * Illustrative angle in radians on the schematic plane for a given body and
 * elapsed schematic time in Earth days.
 */
export function schematicAngleRadians(
  id: SolarSystemBodyId,
  elapsedDays: number,
): number {
  const body = bodyById(id);
  const periodDays = body.facts.siderealOrbitPeriodDays;
  if (
    body.orbitRadius === 0 ||
    periodDays === null ||
    !Number.isFinite(elapsedDays) ||
    elapsedDays === 0
  ) {
    return body.phaseRadians;
  }
  return body.phaseRadians + (2 * Math.PI * elapsedDays) / periodDays;
}

/**
 * Illustrative angular speed in radians per Earth day (`2 * PI / periodDays`).
 * Returns `0` for the central Sun.
 */
export function schematicAngularSpeedRadPerDay(id: SolarSystemBodyId): number {
  const body = bodyById(id);
  const periodDays = body.facts.siderealOrbitPeriodDays;
  if (body.orbitRadius === 0 || periodDays === null || periodDays <= 0) {
    return 0;
  }
  return (2 * Math.PI) / periodDays;
}

/**
 * Illustrative schematic position `[x, 0, z]` in scene units at `elapsedDays`.
 * At `elapsedDays === 0`, returns the exact static `bodyPosition(id)`.
 */
export function schematicBodyPosition(
  id: SolarSystemBodyId,
  elapsedDays: number,
): [number, number, number] {
  if (!Number.isFinite(elapsedDays) || elapsedDays === 0) {
    return bodyPosition(id);
  }
  return bodyPositionAtDays(id, elapsedDays);
}

/** Advances the schematic elapsed-day counter deterministically within `[0, 3650]`. */
export function advanceSchematicDays(
  elapsedDays: number,
  realDeltaSeconds: number,
  daysPerSecond: number,
  maxDays = SCHEMATIC_DURATION_MAX_DAYS,
): number {
  const bound = Number.isFinite(maxDays) && maxDays > 0 ? maxDays : SCHEMATIC_DURATION_MAX_DAYS;
  const start = Math.min(Math.max(Number.isFinite(elapsedDays) ? elapsedDays : 0, 0), bound);
  if (!Number.isFinite(realDeltaSeconds) || realDeltaSeconds <= 0) {
    return start;
  }
  if (!Number.isFinite(daysPerSecond) || daysPerSecond <= 0) {
    return start;
  }
  return Math.min(Math.max(start + realDeltaSeconds * daysPerSecond, 0), bound);
}

/** Steps the schematic elapsed-day counter by `deltaDays`, clamped to `[0, 3650]`. */
export function stepSchematicDays(
  elapsedDays: number,
  deltaDays: number,
  maxDays = SCHEMATIC_DURATION_MAX_DAYS,
): number {
  const bound = Number.isFinite(maxDays) && maxDays > 0 ? maxDays : SCHEMATIC_DURATION_MAX_DAYS;
  const start = Number.isFinite(elapsedDays) ? elapsedDays : 0;
  const delta = Number.isFinite(deltaDays) ? deltaDays : 0;
  return Math.min(Math.max(start + delta, 0), bound);
}
