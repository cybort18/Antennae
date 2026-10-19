/**
 * Procedural Earth placeholder.
 *
 * Scope: simple geometry only — no external models or textures in this
 * milestone. The sphere radius uses the uniform display scale, so its size
 * relative to the orbit is physically proportional. It is a smooth sphere
 * approximation of the central body: no terrain, oblateness, or rotation.
 */

import { memo } from 'react';

export const EarthSphere = memo(function EarthSphere({ radiusUnits }: { radiusUnits: number }) {
  return (
    <mesh name="central-body-earth">
      <sphereGeometry args={[radiusUnits, 64, 48]} />
      <meshStandardMaterial
        color="#143c5e"
        emissive="#061626"
        emissiveIntensity={0.4}
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  );
});
