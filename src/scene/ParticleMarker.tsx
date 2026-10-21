/**
 * The simulated test particle, drawn at an exact recorded sample position.
 * The marker is exaggerated in size for visibility; the position is not.
 */

import { memo } from 'react';
import { AdditiveBlending } from 'three';

export const ParticleMarker = memo(function ParticleMarker({
  position,
  radiusUnits,
}: {
  position: [number, number, number];
  radiusUnits: number;
}) {
  return (
    <group name="test-particle" position={position}>
      <mesh>
        <sphereGeometry args={[radiusUnits, 20, 16]} />
        <meshBasicMaterial color="#dcffff" toneMapped={false} />
      </mesh>
      <mesh scale={2.8}>
        <sphereGeometry args={[radiusUnits, 20, 16]} />
        <meshBasicMaterial
          color="#65e7ff"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
});
