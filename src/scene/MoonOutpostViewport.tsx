/**
 * 3D Viewport for the Junior Astronaut Moon Outpost Trainer (Artemis Base Camp).
 *
 * Renders the Moon globe, grazing polar low-elevation solar lighting, and a
 * surface marker targeting Shackleton Crater Rim Alpha (89.9°S, 0.0°E) with
 * its high-elevation vertical solar tower.
 *
 * Presentation only: does not feed back into the outpost resource simulation.
 */

import { memo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { AdditiveBlending, DoubleSide, Mesh } from 'three';

import { Starfield } from './Starfield';

// Shackleton Crater coordinates: 89.9°S, 0.0°E (Lunar South Pole Ridge)
const MOON_RADIUS_UNITS = 2.85;
const SHACKLETON_LAT_RAD = (-89.9 * Math.PI) / 180;
const SHACKLETON_LON_RAD = 0.0;

const SHACKLETON_X =
  MOON_RADIUS_UNITS * Math.cos(SHACKLETON_LAT_RAD) * Math.cos(SHACKLETON_LON_RAD);
const SHACKLETON_Y = MOON_RADIUS_UNITS * Math.sin(SHACKLETON_LAT_RAD);
const SHACKLETON_Z =
  -MOON_RADIUS_UNITS * Math.cos(SHACKLETON_LAT_RAD) * Math.sin(SHACKLETON_LON_RAD);

const MOON_OUTPOST_CAMERA_POSITION: [number, number, number] = [4.2, -6.8, 7.2];

function MoonGlobe({ insolationFraction }: { insolationFraction: number }) {
  const globeRef = useRef<Mesh>(null);

  // Slow lunar axial rotation (27.3-day synchronous tidally locked period)
  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <group>
      {/* Primary Lunar Regolith Sphere */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[MOON_RADIUS_UNITS, 56, 44]} />
        <meshStandardMaterial
          color="#9da0a6"
          roughness={0.96}
          metalness={0.04}
          bumpScale={0.06}
        />
      </mesh>

      {/* Shackleton Rim Artemis Base Camp Marker */}
      <group position={[SHACKLETON_X, SHACKLETON_Y, SHACKLETON_Z]}>
        {/* Outpost Core Dome */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 0.06, 24]} />
          <meshStandardMaterial color="#d4e8ff" metalness={0.7} roughness={0.25} />
        </mesh>

        {/* Vertical Solar Tower (Elevated for Polar Grazing Light) */}
        <mesh position={[0.04, -0.16, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 12]} />
          <meshBasicMaterial color="#78a6ff" />
        </mesh>

        {/* Pulsing Beacon Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.14, 0.19, 32]} />
          <meshBasicMaterial
            color="#4da6ff"
            side={DoubleSide}
            transparent
            opacity={insolationFraction > 0.05 ? 0.75 : 0.95}
            blending={AdditiveBlending}
          />
        </mesh>

        {/* Light Pillar Beacon */}
        <pointLight
          position={[0, -0.2, 0]}
          color="#6bb3ff"
          intensity={insolationFraction > 0.05 ? 1.8 : 3.2}
          distance={4.5}
        />
      </group>
    </group>
  );
}

export type MoonOutpostViewportProps = {
  insolationFraction: number;
  sol: number;
};

export const MoonOutpostViewport = memo(function MoonOutpostViewport({
  insolationFraction,
  sol,
}: MoonOutpostViewportProps) {
  const isNight = insolationFraction <= 0.05;

  return (
    <div className="viewport" role="region" aria-label="Moon Artemis Base 3D Viewport">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#010306']} />
        {/* Ambient lighting: crisp deep space void */}
        <ambientLight intensity={isNight ? 0.06 : 0.14} />

        {/* Low-elevation polar sun grazing over Shackleton Rim */}
        <directionalLight
          position={[24, -2.5, 30]}
          intensity={isNight ? 0.08 : 2.4}
          color="#fff8f0"
        />

        {/* Earthshine subtle blue reflection */}
        <directionalLight position={[-18, 12, -20]} intensity={0.16} color="#7cb2ff" />

        <Starfield />

        <PerspectiveCamera
          makeDefault
          fov={40}
          position={MOON_OUTPOST_CAMERA_POSITION}
          near={0.1}
          far={1000}
        />

        <MoonGlobe insolationFraction={insolationFraction} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={MOON_RADIUS_UNITS * 1.25}
          maxDistance={MOON_RADIUS_UNITS * 6.5}
        />
      </Canvas>

      {/* Surface Telemetry Watermark & HUD Coordinates */}
      <div className="outpost-hud-watermark" aria-hidden="true">
        <span className="outpost-hud-watermark__site">SHACKLETON CRATER RIM ALPHA</span>
        <span className="outpost-hud-watermark__coords">89.9°S 0.0°E · ELEV +4.2 km</span>
        <span className="outpost-hud-watermark__env">
          DAY {sol} · {isNight ? '🌑 LUNAR NIGHT SHADOW (0% SUN)' : `☀️ INSOLATION ${(insolationFraction * 100).toFixed(0)}%`}
        </span>
      </div>
    </div>
  );
});
