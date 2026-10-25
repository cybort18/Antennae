/**
 * 3D Viewport for the Junior Astronaut Mars Outpost Trainer.
 *
 * Renders Mars using the local high-resolution texture, a dynamic dust-storm
 * atmospheric shell matching the current Sol's optical depth tau, and a surface
 * marker targeting Jezero Crater Outpost Alpha (18.38°N, 77.58°E).
 *
 * Presentation only: does not feed back into the outpost resource simulation.
 */

import { memo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { AdditiveBlending, BackSide, Group, Mesh, MeshBasicMaterial, type Texture } from 'three';

import { Starfield } from './Starfield';
import { useLocalTexture } from './useLocalTexture';

export const MARS_TEXTURE_URL = '/assets/planets/mars.jpg';

// Jezero Crater coordinates: 18.38°N, 77.58°E
const MARS_RADIUS_UNITS = 3.4;
const JEZERO_LAT_RAD = (18.38 * Math.PI) / 180;
const JEZERO_LON_RAD = (77.58 * Math.PI) / 180;

const JEZERO_X = MARS_RADIUS_UNITS * Math.cos(JEZERO_LAT_RAD) * Math.cos(JEZERO_LON_RAD);
const JEZERO_Y = MARS_RADIUS_UNITS * Math.sin(JEZERO_LAT_RAD);
const JEZERO_Z = -MARS_RADIUS_UNITS * Math.cos(JEZERO_LAT_RAD) * Math.sin(JEZERO_LON_RAD);

const MARS_OUTPOST_CAMERA_POSITION: [number, number, number] = [8.5, 4.2, 9.8];

const DUST_ATMOSPHERE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const DUST_ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uDustTau;
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 2.8);
    // Color shifts from thin butterscotch haze to thick reddish-amber dust storm
    vec3 clearColor = vec3(0.85, 0.65, 0.45);
    vec3 stormColor = vec3(0.88, 0.40, 0.18);
    vec3 finalColor = mix(clearColor, stormColor, clamp(uDustTau, 0.0, 1.0));
    float alpha = rim * mix(0.35, 0.75, clamp(uDustTau, 0.0, 1.0));
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

function MarsGlobe({
  dustOpacityTau,
  marsTexture,
}: {
  dustOpacityTau: number;
  marsTexture: Texture | null;
}) {
  const marsGroupRef = useRef<Group>(null);
  const beaconPingRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (marsGroupRef.current) {
      marsGroupRef.current.rotation.y += 0.02 * delta;
    }
    if (beaconPingRef.current) {
      const cycle = (state.clock.elapsedTime * 0.8) % 1;
      const s = 1.0 + cycle * 2.8;
      beaconPingRef.current.scale.set(s, s, s);
      const mat = beaconPingRef.current.material as MeshBasicMaterial;
      if (mat) {
        mat.opacity = (1 - cycle) * 0.85;
      }
    }
  });

  return (
    <group rotation={[0.4396, 0, 0]}>
      <group ref={marsGroupRef} name="mars-system">
        {/* Surface Sphere */}
        <mesh name="mars-surface">
          <sphereGeometry args={[MARS_RADIUS_UNITS, 64, 48]} />
          <meshStandardMaterial
            key={marsTexture ? 'mars-textured' : 'mars-procedural'}
            map={marsTexture ?? undefined}
            color={marsTexture ? '#ffffff' : '#c1440e'}
            roughness={0.92}
            metalness={0.04}
          />
        </mesh>

        {/* Dynamic Dust Atmosphere Shell */}
        <mesh name="mars-atmosphere" scale={1.028} renderOrder={2}>
          <sphereGeometry args={[MARS_RADIUS_UNITS, 64, 48]} />
          <shaderMaterial
            vertexShader={DUST_ATMOSPHERE_VERTEX_SHADER}
            fragmentShader={DUST_ATMOSPHERE_FRAGMENT_SHADER}
            uniforms={{
              uDustTau: { value: dustOpacityTau },
            }}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={BackSide}
          />
        </mesh>

        {/* Jezero Crater Outpost Marker */}
        <group position={[JEZERO_X, JEZERO_Y, JEZERO_Z]}>
          <mesh name="outpost-beacon">
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshBasicMaterial color="#00ffcc" />
          </mesh>
          <mesh name="outpost-ring" rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.16, 32]} />
            <meshBasicMaterial color="#00e5ff" transparent opacity={0.8} />
          </mesh>
          {/* Animated Radio Transmission Ping */}
          <mesh ref={beaconPingRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.15, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export interface MarsOutpostViewportProps {
  dustOpacityTau: number;
  sol: number;
}

export const MarsOutpostViewport = memo(function MarsOutpostViewport({
  dustOpacityTau,
  sol,
}: MarsOutpostViewportProps) {
  const marsTexture = useLocalTexture(MARS_TEXTURE_URL);

  return (
    <div className="viewport" role="region" aria-label="Mars Outpost 3D Viewport">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#020408']} />
        <ambientLight intensity={0.22} />
        <directionalLight position={[36, 18, 54]} intensity={1.8} color="#fff6eb" />

        <Starfield />

        <PerspectiveCamera makeDefault fov={40} position={MARS_OUTPOST_CAMERA_POSITION} near={0.1} far={1000} />

        <MarsGlobe dustOpacityTau={dustOpacityTau} marsTexture={marsTexture} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={MARS_RADIUS_UNITS * 1.25}
          maxDistance={MARS_RADIUS_UNITS * 6.5}
        />
      </Canvas>

      {/* Surface Telemetry Watermark & HUD Coordinates */}
      <div className="outpost-hud-watermark" aria-hidden="true">
        <span className="outpost-hud-watermark__site">JEZERO CRATER OUTPOST ALPHA</span>
        <span className="outpost-hud-watermark__coords">18.38°N 77.58°E · ELEV -2.5 km</span>
        <span className="outpost-hud-watermark__env">
          SOL {sol} · DUST OPACITY τ {dustOpacityTau.toFixed(2)}
        </span>
      </div>
    </div>
  );
});
