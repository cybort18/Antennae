/**
 * The simulated test particle, drawn at an exact recorded sample position.
 * The marker is exaggerated in size for visibility; the position is not.
 */

import { memo } from 'react';

export const ParticleMarker = memo(function ParticleMarker({
  position,
  radiusUnits,
}: {
  position: [number, number, number];
  radiusUnits: number;
}) {
  return (
    <mesh name="test-particle" position={position}>
      <sphereGeometry args={[radiusUnits, 20, 16]} />
      <meshBasicMaterial color="#8ef6ff" toneMapped={false} />
    </mesh>
  );
});
