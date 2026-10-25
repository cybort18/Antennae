/**
 * The simulated test particle, drawn at an exact recorded sample position.
 * The marker is exaggerated in size for visibility; the position is not.
 */

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Mesh, MeshBasicMaterial } from 'three';

export const ParticleMarker = memo(function ParticleMarker({
  position,
  radiusUnits,
}: {
  position: [number, number, number];
  radiusUnits: number;
}) {
  const outerBeaconRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (outerBeaconRef.current) {
      const pulse = 2.4 + Math.sin(state.clock.elapsedTime * 4.5) * 0.45;
      outerBeaconRef.current.scale.set(pulse, pulse, pulse);
      const mat = outerBeaconRef.current.material as MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 4.5) * 0.07;
      }
    }
  });

  return (
    <group name="test-particle" position={position}>
      <mesh>
        <sphereGeometry args={[radiusUnits, 20, 16]} />
        <meshBasicMaterial color="#dcffff" toneMapped={false} />
      </mesh>
      <mesh ref={outerBeaconRef} scale={2.8}>
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
