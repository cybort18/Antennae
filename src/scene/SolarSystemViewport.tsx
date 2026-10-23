/**
 * Solar System Overview scene.
 *
 * This is a display-only reference visualization. It renders a static,
 * schematic arrangement of the Sun and eight planets; it does not read
 * simulation samples, run the Earth-orbit engine, or claim ephemeris accuracy.
 *
 * The body positions, orbit radii, and sphere radii come from the display-only
 * `src/solarSystem/bodies.ts` registry. They are never converted back to
 * physical units or written into the Earth Orbit Lab state.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { AdditiveBlending, DoubleSide, Vector3 } from 'three';

import {
  SOLAR_SYSTEM_BODIES,
  bodyById,
  cameraPose,
  type CameraFocusMode,
  type SolarSystemBody,
  type SolarSystemBodyId,
} from '../solarSystem/bodies';
import { schematicBodyPosition } from '../solarSystem/schematicMotion';
import { Starfield } from './Starfield';
import { planetSurfaceState } from './planetSurface';
import { useLocalTexture } from './useLocalTexture';

const ORBIT_SEGMENTS = 160;

function CameraFocus({
  focusMode,
  selectedId,
  focusSignal,
  elapsedDays,
}: {
  focusMode: CameraFocusMode;
  selectedId: SolarSystemBodyId;
  focusSignal: number;
  elapsedDays: number;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as
    | { target: { set: (x: number, y: number, z: number) => void }; update: () => void }
    | null;

  const elapsedDaysRef = useRef(elapsedDays);
  useEffect(() => {
    elapsedDaysRef.current = elapsedDays;
  }, [elapsedDays]);

  const lastTargetRef = useRef<[number, number, number]>(
    cameraPose(focusMode, selectedId, elapsedDays).target,
  );

  // Explicit camera snap when selection, focusMode, focusSignal, or viewport size changes.
  useEffect(() => {
    const pose = cameraPose(focusMode, selectedId, elapsedDaysRef.current);
    // Narrow canvases have a smaller horizontal field of view. Pull the
    // overview camera back a little so the outer orbit guides and labels stay
    // inside the frame; this is framing only.
    const aspect = size.width / Math.max(size.height, 1);
    const overviewScale =
      focusMode === 'overview' ? Math.min(1.45, Math.max(1, 1.12 / aspect)) : 1;
    camera.position.set(
      pose.position[0] * overviewScale,
      pose.position[1] * overviewScale,
      pose.position[2] * overviewScale,
    );
    camera.lookAt(...pose.target);
    lastTargetRef.current = [...pose.target];
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, controls, focusMode, focusSignal, selectedId, size.height, size.width]);

  // When a planet is focused and schematic time changes, translate the camera and
  // OrbitControls target by the body's schematic displacement so the camera
  // follows the moving body while preserving user orbit/zoom adjustments.
  useEffect(() => {
    if (focusMode !== 'body') {
      return;
    }
    const nextTarget = cameraPose('body', selectedId, elapsedDays).target;
    const [prevX, prevY, prevZ] = lastTargetRef.current;
    const dx = nextTarget[0] - prevX;
    const dy = nextTarget[1] - prevY;
    const dz = nextTarget[2] - prevZ;
    if (Math.hypot(dx, dy, dz) < 1e-12) {
      return;
    }
    lastTargetRef.current = [...nextTarget];
    camera.position.set(
      camera.position.x + dx,
      camera.position.y + dy,
      camera.position.z + dz,
    );
    if (controls) {
      controls.target.set(...nextTarget);
      controls.update();
    } else {
      camera.lookAt(...nextTarget);
    }
  }, [camera, controls, elapsedDays, focusMode, selectedId]);

  return null;
}

function OrbitGuide({
  body,
  selected,
}: {
  body: SolarSystemBody;
  selected: boolean;
}) {
  const points = useMemo(() => {
    const next: Vector3[] = [];
    for (let index = 0; index <= ORBIT_SEGMENTS; index += 1) {
      const angle = (index / ORBIT_SEGMENTS) * Math.PI * 2;
      next.push(
        new Vector3(
          Math.cos(angle) * body.orbitRadius,
          0,
          Math.sin(angle) * body.orbitRadius,
        ),
      );
    }
    return next;
  }, [body.orbitRadius]);

  return (
    <Line
      points={points}
      color={selected ? '#9ceaf4' : '#56758e'}
      transparent
      opacity={selected ? 0.58 : 0.24}
      lineWidth={selected ? 1.35 : 0.85}
    />
  );
}

type LabelPositionUpdater = (
  id: SolarSystemBodyId,
  x: number,
  y: number,
  visible: boolean,
) => void;

type LabelRefMap = Partial<Record<SolarSystemBodyId, HTMLButtonElement | null>>;

function LabelProjector({
  elapsedDays,
  onUpdate,
}: {
  elapsedDays: number;
  onUpdate: LabelPositionUpdater;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const point = useMemo(() => new Vector3(), []);

  useFrame(() => {
    for (const body of SOLAR_SYSTEM_BODIES) {
      const [x, , z] = schematicBodyPosition(body.id, elapsedDays);
      const labelHeight = body.displayRadius + (body.id === 'sun' ? 1.9 : 0.68);
      point.set(x, labelHeight, z).project(camera);

      if (point.z < -1 || point.z > 1) {
        onUpdate(body.id, 0, 0, false);
        continue;
      }

      const screenX = (point.x * 0.5 + 0.5) * size.width;
      const screenY = (-point.y * 0.5 + 0.5) * size.height;
      if (screenX < -80 || screenX > size.width + 80 || screenY < -40 || screenY > size.height + 40) {
        onUpdate(body.id, 0, 0, false);
        continue;
      }

      onUpdate(body.id, screenX, screenY, true);
    }
  });

  return null;
}

function SaturnRing({
  body,
  position,
}: {
  body: SolarSystemBody;
  position: [number, number, number];
}) {
  const ring = body.ring;
  if (!ring) {
    return null;
  }

  const bands: Array<[number, number]> = ring.gap
    ? [
        [ring.innerRadius, ring.gap[0]],
        [ring.gap[1], ring.outerRadius],
      ]
    : [[ring.innerRadius, ring.outerRadius]];

  return (
    <group>
      {bands.map(([inner, outer], index) => (
        <mesh
          key={`${body.id}-ring-${index}`}
          name={`${body.id}-rings-${index}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={position}
          renderOrder={1}
        >
          <ringGeometry args={[body.displayRadius * inner, body.displayRadius * outer, 96]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={ring.opacity}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function PlanetBody({
  body,
  elapsedDays,
  selected,
  onSelect,
}: {
  body: SolarSystemBody;
  elapsedDays: number;
  selected: boolean;
  onSelect: (id: SolarSystemBodyId) => void;
}) {
  const texture = useLocalTexture(body.texture?.localPath ?? null);
  const position = schematicBodyPosition(body.id, elapsedDays);
  const isGasGiant = body.kind === 'gas-giant' || body.kind === 'ice-giant';
  const surface = planetSurfaceState(texture, body.fallbackColor);

  return (
    <group>
      <mesh
        name={`overview-${body.id}`}
        position={position}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(body.id);
        }}
      >
        <sphereGeometry args={[body.displayRadius, 40, 28]} />
        <meshStandardMaterial
          key={surface.usesFallback ? 'fallback' : 'texture'}
          map={surface.map ?? undefined}
          color={surface.color}
          roughness={isGasGiant ? 0.76 : 0.93}
          metalness={0.01}
          emissive={surface.usesFallback ? '#07121c' : '#02060b'}
          emissiveIntensity={surface.usesFallback ? 0.22 : 0.12}
        />
      </mesh>

      {body.ring ? <SaturnRing body={body} position={position} /> : null}

      {selected ? (
        <mesh position={position} scale={1.22} renderOrder={0}>
          <sphereGeometry args={[body.displayRadius, 28, 20]} />
          <meshBasicMaterial
            color="#b9f5ff"
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function Sun({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: (id: SolarSystemBodyId) => void;
}) {
  const body = bodyById('sun');

  return (
    <group>
      <mesh
        name="overview-sun"
        onClick={(event) => {
          event.stopPropagation();
          onSelect('sun');
        }}
      >
        <sphereGeometry args={[body.displayRadius, 48, 32]} />
        <meshBasicMaterial color="#ffd38a" toneMapped={false} />
      </mesh>
      <mesh scale={1.2}>
        <sphereGeometry args={[body.displayRadius, 40, 28]} />
        <meshBasicMaterial
          color="#ff9a3c"
          transparent
          opacity={0.13}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, 0, 0]}
        color="#ffe0b2"
        intensity={48}
        distance={80}
        decay={2}
      />
      {selected ? (
        <mesh scale={1.38}>
          <sphereGeometry args={[body.displayRadius, 36, 24]} />
          <meshBasicMaterial
            color="#fff0c0"
            transparent
            opacity={0.1}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

export type SolarSystemViewportProps = {
  selectedId: SolarSystemBodyId;
  focusMode: CameraFocusMode;
  focusSignal: number;
  elapsedDays?: number;
  onSelect: (id: SolarSystemBodyId) => void;
};

export function SolarSystemViewport({
  selectedId,
  focusMode,
  focusSignal,
  elapsedDays = 0,
  onSelect,
}: SolarSystemViewportProps) {
  const initialPose = cameraPose(focusMode, selectedId, elapsedDays);
  const labelRefs = useRef<LabelRefMap>({});

  const updateLabel = useCallback<LabelPositionUpdater>((id, x, y, visible) => {
    const element = labelRefs.current[id];
    if (!element) {
      return;
    }

    if (!visible) {
      element.style.visibility = 'hidden';
      return;
    }

    element.style.visibility = 'visible';
    element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }, []);

  return (
    <div
      className="ss-viewport"
      role="region"
      aria-label="Solar System Overview 3D scene"
      data-testid="solar-system-viewport"
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#02050a']} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[14, 24, 10]} intensity={1.65} color="#fff0d8" />
        <directionalLight position={[-20, -8, -16]} intensity={0.32} color="#5d84dd" />

        <Starfield radiusUnits={120} />

        <PerspectiveCamera
          makeDefault
          fov={42}
          near={initialPose.near}
          far={initialPose.far}
          position={initialPose.position}
        />

        <CameraFocus
          focusMode={focusMode}
          selectedId={selectedId}
          focusSignal={focusSignal}
          elapsedDays={elapsedDays}
        />
        <LabelProjector elapsedDays={elapsedDays} onUpdate={updateLabel} />

        <Sun selected={selectedId === 'sun'} onSelect={onSelect} />

        {SOLAR_SYSTEM_BODIES.filter((body) => body.id !== 'sun').map((body) => (
          <OrbitGuide
            key={`orbit-${body.id}`}
            body={body}
            selected={body.id === selectedId}
          />
        ))}

        {SOLAR_SYSTEM_BODIES.filter((body) => body.id !== 'sun').map((body) => (
          <PlanetBody
            key={body.id}
            body={body}
            elapsedDays={elapsedDays}
            selected={body.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0, 0]}
          minDistance={2}
          maxDistance={100}
        />
      </Canvas>

      <div className="ss-viewport__vignette" aria-hidden="true" />

      <div className="ss-viewport__labels" aria-label="Select a body">
        {SOLAR_SYSTEM_BODIES.map((body) => (
          <button
            key={`label-${body.id}`}
            ref={(node) => {
              labelRefs.current[body.id] = node;
            }}
            type="button"
            className={body.id === selectedId ? 'ss-label is-selected' : 'ss-label'}
            aria-pressed={body.id === selectedId}
            aria-label={`Focus ${body.name}`}
            onClick={() => onSelect(body.id)}
          >
            <span
              className="ss-label__dot"
              style={{ backgroundColor: body.accentColor }}
              aria-hidden="true"
            />
            <span>{body.name}</span>
          </button>
        ))}
      </div>

      <div className="ss-viewport__overlay ss-viewport__overlay--top-left">
        <span className="ss-badge">REFERENCE VISUALIZATION</span>
        <p className="ss-viewport__hint">
          {elapsedDays === 0
            ? 'Static schematic layout · no ephemeris or dynamics'
            : 'Illustrative schematic motion · not an ephemeris'}
        </p>
      </div>

      <div className="ss-viewport__overlay ss-viewport__overlay--top-right">
        <p className="ss-viewport__hint">Drag to orbit · scroll to zoom</p>
      </div>

      <div className="ss-viewport__overlay ss-viewport__overlay--bottom-left">
        <span className="ss-badge ss-badge--muted">NOT TO SCALE</span>
        <p className="ss-viewport__hint">
          Body sizes, orbit spacing, and positions are composed for legibility.
        </p>
      </div>

      <div className="ss-viewport__overlay ss-viewport__overlay--bottom-right">
        <a
          className="ss-viewport__credit"
          href="https://earthobservatory.nasa.gov/features/BlueMarble"
          target="_blank"
          rel="noreferrer"
        >
          Earth: NASA Earth Observatory
        </a>
        <span className="ss-viewport__credit-separator"> · </span>
        <a
          className="ss-viewport__credit"
          href="https://science.nasa.gov/3d-resources/"
          target="_blank"
          rel="noreferrer"
        >
          Planet maps: NASA 3D Resources
        </a>
      </div>
    </div>
  );
}
