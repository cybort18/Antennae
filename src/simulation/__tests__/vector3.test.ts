/**
 * Vector primitive sanity tests.
 * Tolerances are exact (toBe/toBeCloseTo) because these are pure arithmetic
 * operations with no integration error involved.
 */
import { describe, expect, it } from 'vitest';

import {
  ZERO_VEC3,
  add,
  cross,
  distance,
  dot,
  isFiniteVec3,
  magnitude,
  magnitudeSquared,
  scale,
  subtract,
  vec3,
} from '../vector3';

describe('vector3 primitives', () => {
  it('adds, subtracts, and scales component-wise', () => {
    const a = vec3(1, 2, 3);
    const b = vec3(-4, 5, 0.5);

    expect(add(a, b)).toEqual({ x: -3, y: 7, z: 3.5 });
    expect(subtract(a, b)).toEqual({ x: 5, y: -3, z: 2.5 });
    expect(scale(a, 0.5)).toEqual({ x: 0.5, y: 1, z: 1.5 });
  });

  it('computes dot products, including orthogonality', () => {
    expect(dot(vec3(1, 0, 0), vec3(0, 1, 0))).toBe(0);
    expect(dot(vec3(1, 2, 3), vec3(4, -5, 6))).toBe(4 - 10 + 18);
  });

  it('produces a right-handed cross product (x cross y = z)', () => {
    const x = vec3(1, 0, 0);
    const y = vec3(0, 1, 0);
    expect(cross(x, y)).toEqual({ x: 0, y: 0, z: 1 });
    expect(cross(y, x)).toEqual({ x: 0, y: 0, z: -1 });
    expect(cross(vec3(0, 0, 1), y)).toEqual({ x: -1, y: 0, z: 0 });
  });

  it('computes magnitudes and squared magnitudes', () => {
    expect(magnitude(vec3(3, 4, 0))).toBe(5);
    expect(magnitudeSquared(vec3(3, 4, 0))).toBe(25);
    expect(magnitude(ZERO_VEC3)).toBe(0);
  });

  it('computes distances between points', () => {
    expect(distance(vec3(1, 1, 1), vec3(1, 1, 1))).toBe(0);
    expect(distance(vec3(0, 0, 0), vec3(1, 2, 2))).toBe(3);
  });

  it('detects non-finite components (NaN and Infinity)', () => {
    expect(isFiniteVec3(vec3(0, 0, 0))).toBe(true);
    expect(isFiniteVec3(vec3(Number.NaN, 0, 0))).toBe(false);
    expect(isFiniteVec3(vec3(0, Number.POSITIVE_INFINITY, 0))).toBe(false);
    expect(isFiniteVec3(vec3(0, 0, Number.NEGATIVE_INFINITY))).toBe(false);
  });
});
