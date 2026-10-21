/**
 * Deterministic background star field.
 *
 * This is a presentation backdrop, not a catalog of real stars. A small seeded
 * generator keeps the same field on every run and avoids a large downloaded
 * panorama or a network request. Stars are drawn on a distant shell and never
 * participate in camera framing or physics.
 */

import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';

const STAR_COUNT = 1600;
const DEFAULT_SHELL_RADIUS_UNITS = 900;
const SEED = 0x51a7c0de;

/** Small deterministic PRNG (mulberry32). */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function starColor(random: () => number): [number, number, number] {
  const draw = random();
  if (draw < 0.08) {
    return [0.72, 0.82, 1];
  }
  if (draw < 0.14) {
    return [1, 0.84, 0.66];
  }
  return [0.86, 0.92, 1];
}

export const Starfield = memo(function Starfield({
  radiusUnits = DEFAULT_SHELL_RADIUS_UNITS,
}: {
  /** Display-only distance of the background star shell. */
  radiusUnits?: number;
}) {
  const geometry = useMemo(() => {
    const random = createRandom(SEED);
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);

    for (let index = 0; index < STAR_COUNT; index += 1) {
      // Uniform directions on a sphere; the tiny radial offset avoids a flat
      // shell while remaining far behind the simulated scene.
      const z = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const radius = radiusUnits * (0.92 + random() * 0.16);
      const planar = Math.sqrt(Math.max(0, 1 - z * z));

      positions[index * 3] = radius * planar * Math.cos(angle);
      positions[index * 3 + 1] = radius * z;
      positions[index * 3 + 2] = radius * planar * Math.sin(angle);

      const [red, green, blue] = starColor(random);
      const brightness = 0.45 + random() * 0.55;
      colors[index * 3] = red * brightness;
      colors[index * 3 + 1] = green * brightness;
      colors[index * 3 + 2] = blue * brightness;
    }

    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return next;
  }, [radiusUnits]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

  return (
    <points name="background-stars" geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={1.35}
        sizeAttenuation={false}
        vertexColors
        transparent
        opacity={0.82}
        depthWrite={false}
      />
    </points>
  );
});
