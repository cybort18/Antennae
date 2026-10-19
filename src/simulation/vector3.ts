/**
 * Minimal 3D vector primitives.
 *
 * Deliberately framework-independent and dependency-free: these helpers are
 * used by the physics core and its tests, and later by the scenario layer.
 * A `Vec3` carries no unit information; the caller must know whether a value is
 * in km, km/s, or km/s^2 (see units.ts).
 */

export type Vec3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const ZERO_VEC3: Vec3 = { x: 0, y: 0, z: 0 };

export const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

export const subtract = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const scale = (a: Vec3, factor: number): Vec3 => ({
  x: a.x * factor,
  y: a.y * factor,
  z: a.z * factor,
});

export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** Right-handed cross product: x cross y = z. */
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const magnitudeSquared = (a: Vec3): number => a.x * a.x + a.y * a.y + a.z * a.z;

export const magnitude = (a: Vec3): number => Math.sqrt(magnitudeSquared(a));

export const distance = (a: Vec3, b: Vec3): number => magnitude(subtract(a, b));

/** True only when every component is a finite number (rejects NaN and +/-Infinity). */
export const isFiniteVec3 = (a: Vec3): boolean =>
  Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z);
