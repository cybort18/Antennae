/**
 * Earth display geometry.
 *
 * The sphere radius still comes from the one-way kilometre -> scene-unit
 * transform, so its size relative to the trajectory remains proportional. The
 * surface and cloud textures, atmosphere shell, and decorative rotation are
 * presentation only: they are static local assets, never physical data, and
 * never feed back into the simulation state.
 *
 * If the surface texture cannot be loaded, the surface falls back to the
 * original procedural colour; a missing cloud texture simply omits the cloud
 * shell. The simulation is unaffected by either path.
 */

import { memo } from 'react';
import { AdditiveBlending, BackSide, NoColorSpace } from 'three';

import { useLocalTexture } from './useLocalTexture';

export const EARTH_DAY_TEXTURE_URL = '/assets/earth/blue-marble-2048.jpg';
export const EARTH_CLOUD_TEXTURE_URL = '/assets/earth/blue-marble-clouds-2048.jpg';

const ATMOSPHERE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 3.2);
    gl_FragColor = vec4(0.16, 0.5, 1.0, rim * 0.45);
  }
`;

export const EarthSphere = memo(function EarthSphere({
  radiusUnits,
}: {
  radiusUnits: number;
}) {
  const dayTexture = useLocalTexture(EARTH_DAY_TEXTURE_URL);
  const cloudTexture = useLocalTexture(EARTH_CLOUD_TEXTURE_URL, NoColorSpace);

  return (
    <group name="central-body-earth" rotation={[0, -0.55, 0]}>
      <mesh name="central-body-surface">
        <sphereGeometry args={[radiusUnits, 64, 48]} />
        {/*
          The key forces a fresh material when the texture finishes loading.
          A MeshStandardMaterial compiled without a map does not start sampling
          one merely because React assigns a new `map`; recreating it makes the
          shader compile with USE_MAP instead of leaving a flat white sphere.
        */}
        <meshStandardMaterial
          key={dayTexture ? 'day-texture' : 'procedural'}
          map={dayTexture}
          color={dayTexture ? '#ffffff' : '#143c5e'}
          emissive={dayTexture ? '#020912' : '#061626'}
          emissiveIntensity={dayTexture ? 0.2 : 0.4}
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>

      {dayTexture && cloudTexture ? (
        <mesh name="central-body-clouds" scale={1.012}>
          <sphereGeometry args={[radiusUnits, 64, 48]} />
          <meshStandardMaterial
            alphaMap={cloudTexture}
            color="#dceeff"
            transparent
            opacity={0.24}
            depthWrite={false}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ) : null}

      <mesh name="central-body-atmosphere" scale={1.032} renderOrder={2}>
        <sphereGeometry args={[radiusUnits, 64, 48]} />
        <shaderMaterial
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={BackSide}
        />
      </mesh>
    </group>
  );
});
