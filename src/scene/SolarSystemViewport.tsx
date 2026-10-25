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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import {
  AdditiveBlending,
  DoubleSide,
  Group,
  Mesh,
  PointLight,
  Vector3,
} from 'three';

import {
  BENNU_MODEL,
  SOLAR_SYSTEM_BODIES,
  bodyById,
  cameraPose,
  type CameraFocusMode,
  type SolarSystemBody,
  type SolarSystemBodyId,
} from '../solarSystem/bodies';
import { schematicBodyPosition } from '../solarSystem/schematicMotion';
import { BennuAsteroidModel } from './BennuAsteroidModel';
import { type BennuMeshStatus } from './bennuModel';
import { Starfield } from './Starfield';
import { planetSurfaceState } from './planetSurface';
import {
  COMPACT_LABEL_VIEWPORT_MAX_WIDTH_PX,
  FALLBACK_LABEL_DIMENSIONS,
  LABEL_COLLISION_MARGIN_PX,
  resolveSolarSystemLabelCollisions,
  type ProjectedLabelCandidate,
  type ResolvedLabelLayout,
} from './solarSystemLabels';
import { useLocalTexture } from './useLocalTexture';
import {
  computeOrbitalState,
  generateOrbitPathScenePoints,
  heliocentricAuToScene,
} from '../solarSystem/astronomy';

const ORBIT_SEGMENTS = 160;

const AXIAL_TILTS: Record<SolarSystemBodyId, number> = {
  sun: 0,
  mercury: 0.0005,
  venus: 3.096, // 177.4 deg retrograde
  earth: 0.4091, // 23.44 deg
  mars: 0.4396, // 25.19 deg
  jupiter: 0.0546, // 3.13 deg
  saturn: 0.4665, // 26.73 deg
  uranus: 1.7064, // 97.77 deg
  neptune: 0.4943, // 28.32 deg
  bennu: 3.096,
};

const SPIN_RATES: Record<SolarSystemBodyId, number> = {
  sun: 0.04,
  mercury: 0.06,
  venus: -0.05,
  earth: 0.28,
  mars: 0.26,
  jupiter: 0.55,
  saturn: 0.50,
  uranus: -0.38,
  neptune: 0.42,
  bennu: 0.70,
};

function getScenePosition(
  bodyId: SolarSystemBodyId,
  julianDate?: number,
  elapsedDays = 0,
): [number, number, number] {
  if (bodyId === 'sun') {
    return [0, 0, 0];
  }
  if (typeof julianDate === 'number' && Number.isFinite(julianDate)) {
    const state = computeOrbitalState(bodyId, julianDate);
    return heliocentricAuToScene(state.positionAu);
  }
  return schematicBodyPosition(bodyId, elapsedDays);
}

function CameraFocus({
  focusMode,
  selectedId,
  focusSignal,
  elapsedDays,
  julianDate,
}: {
  focusMode: CameraFocusMode;
  selectedId: SolarSystemBodyId;
  focusSignal: number;
  elapsedDays: number;
  julianDate?: number;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as
    | {
        target: Vector3;
        addEventListener: (event: string, fn: () => void) => void;
        removeEventListener: (event: string, fn: () => void) => void;
      }
    | null;

  const elapsedDaysRef = useRef(elapsedDays);
  const julianDateRef = useRef(julianDate);
  useEffect(() => {
    elapsedDaysRef.current = elapsedDays;
    julianDateRef.current = julianDate;
  }, [elapsedDays, julianDate]);

  const lastTargetRef = useRef<[number, number, number]>(
    focusMode === 'body'
      ? getScenePosition(selectedId, julianDate, elapsedDays)
      : [0, 0, 0],
  );

  // Smooth cinematic camera transition state
  const initializedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const transitionProgressRef = useRef(1); // 1 = complete
  const startPosRef = useRef(new Vector3());
  const startTargetRef = useRef(new Vector3());
  const endPosRef = useRef(new Vector3());
  const endTargetRef = useRef(new Vector3());

  // Cancel programmatic camera transition immediately when user begins dragging or interacting
  useEffect(() => {
    if (!controls) {
      return undefined;
    }
    const handleUserInteraction = () => {
      isTransitioningRef.current = false;
      transitionProgressRef.current = 1;
    };
    controls.addEventListener('start', handleUserInteraction);
    return () => {
      controls.removeEventListener('start', handleUserInteraction);
    };
  }, [controls]);

  // Trigger camera flight transition when selection, focusMode, or focusSignal changes.
  useEffect(() => {
    const pose = cameraPose(focusMode, selectedId, elapsedDaysRef.current);
    const targetArr =
      focusMode === 'body'
        ? getScenePosition(selectedId, julianDateRef.current, elapsedDaysRef.current)
        : pose.target;

    const aspect = size.width / Math.max(size.height, 1);
    const overviewScale =
      focusMode === 'overview' ? Math.min(1.45, Math.max(1, 1.12 / aspect)) : 1;

    let destCamPosArr: [number, number, number];
    if (focusMode === 'body') {
      const body = bodyById(selectedId);
      const distance =
        selectedId === 'bennu'
          ? 0.95 + body.displayRadius * 4.5
          : 1.5 + body.displayRadius * 6.2;
      const length = Math.hypot(0.37, 0.85, 0.37);
      destCamPosArr = [
        targetArr[0] + (0.37 / length) * distance,
        targetArr[1] + (0.85 / length) * distance,
        targetArr[2] + (0.37 / length) * distance,
      ];
    } else {
      destCamPosArr = [
        pose.position[0] * overviewScale,
        pose.position[1] * overviewScale,
        pose.position[2] * overviewScale,
      ];
    }

    if (!initializedRef.current) {
      camera.position.set(...destCamPosArr);
      camera.lookAt(...targetArr);
      lastTargetRef.current = [...targetArr];
      if (controls) {
        controls.target.set(...targetArr);
        initializedRef.current = true;
      }
      return;
    }

    // Set up smooth camera flight
    startPosRef.current.copy(camera.position);
    if (controls) {
      startTargetRef.current.copy(controls.target);
    } else {
      startTargetRef.current.set(...lastTargetRef.current);
    }
    endPosRef.current.set(...destCamPosArr);
    endTargetRef.current.set(...targetArr);
    transitionProgressRef.current = 0;
    isTransitioningRef.current = true;
    lastTargetRef.current = [...targetArr];
  }, [camera, controls, focusMode, focusSignal, selectedId, size.height, size.width]);

  // Frame update: interpolate camera flight or smoothly track orbiting body
  useFrame((state, delta) => {
    const frameCamera = state.camera;
    const frameControls = state.controls as { target: Vector3 } | null;

    if (isTransitioningRef.current) {
      transitionProgressRef.current = Math.min(1, transitionProgressRef.current + delta * 2.0);
      const p = transitionProgressRef.current;
      const t = 1 - Math.pow(1 - p, 3);

      if (focusMode === 'body') {
        const currentTarget = getScenePosition(selectedId, julianDateRef.current, elapsedDaysRef.current);
        endTargetRef.current.set(...currentTarget);
        const body = bodyById(selectedId);
        const distance =
          selectedId === 'bennu'
            ? 0.95 + body.displayRadius * 4.5
            : 1.5 + body.displayRadius * 6.2;
        const length = Math.hypot(0.37, 0.85, 0.37);
        endPosRef.current.set(
          currentTarget[0] + (0.37 / length) * distance,
          currentTarget[1] + (0.85 / length) * distance,
          currentTarget[2] + (0.37 / length) * distance,
        );
      }

      frameCamera.position.lerpVectors(startPosRef.current, endPosRef.current, t);
      if (frameControls) {
        frameControls.target.lerpVectors(startTargetRef.current, endTargetRef.current, t);
      } else {
        frameCamera.lookAt(endTargetRef.current);
      }

      if (transitionProgressRef.current >= 1) {
        isTransitioningRef.current = false;
        lastTargetRef.current = [endTargetRef.current.x, endTargetRef.current.y, endTargetRef.current.z];
      }
    } else if (focusMode === 'body') {
      // Smoothly track orbiting body as simulation date advances
      const nextTarget = getScenePosition(selectedId, julianDateRef.current, elapsedDaysRef.current);
      const [prevX, prevY, prevZ] = lastTargetRef.current;
      const dx = nextTarget[0] - prevX;
      const dy = nextTarget[1] - prevY;
      const dz = nextTarget[2] - prevZ;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 1e-12) {
        lastTargetRef.current = [...nextTarget];
        if (dist < 2.0) {
          // Continuous smooth motion: shift camera position and target by the body's delta
          frameCamera.position.x += dx;
          frameCamera.position.y += dy;
          frameCamera.position.z += dz;
          if (frameControls) {
            frameControls.target.set(...nextTarget);
          }
        } else {
          // Large date jump: preserve current relative viewing vector without jumping or flinging
          if (frameControls) {
            const offsetX = frameCamera.position.x - prevX;
            const offsetY = frameCamera.position.y - prevY;
            const offsetZ = frameCamera.position.z - prevZ;
            frameCamera.position.set(nextTarget[0] + offsetX, nextTarget[1] + offsetY, nextTarget[2] + offsetZ);
            frameControls.target.set(...nextTarget);
          }
        }
      }
    }
  });

  return null;
}

function OrbitGuide({
  body,
  julianDate,
  selected,
}: {
  body: SolarSystemBody;
  julianDate?: number;
  selected: boolean;
}) {
  const points = useMemo(() => {
    if (typeof julianDate === 'number' && Number.isFinite(julianDate) && body.id !== 'sun') {
      const pathPoints = generateOrbitPathScenePoints(body.id, julianDate, ORBIT_SEGMENTS);
      if (pathPoints.length > 0) {
        return pathPoints.map(([x, y, z]) => new Vector3(x, y, z));
      }
    }
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
  }, [body.id, body.orbitRadius, julianDate]);

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


type LabelRefMap = Partial<Record<SolarSystemBodyId, HTMLButtonElement | null>>;

function LabelProjector({
  elapsedDays,
  julianDate,
  selectedId,
  getLabelDimensions,
  onUpdate,
}: {
  elapsedDays: number;
  julianDate?: number;
  selectedId: SolarSystemBodyId;
  getLabelDimensions: (id: SolarSystemBodyId) => { width: number; height: number };
  onUpdate: (layouts: readonly ResolvedLabelLayout[]) => void;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const point = useMemo(() => new Vector3(), []);
  const candidatesBufferRef = useRef<ProjectedLabelCandidate[]>(
    SOLAR_SYSTEM_BODIES.map((body) => ({
      id: body.id,
      x: 0,
      y: 0,
      width: FALLBACK_LABEL_DIMENSIONS[body.id].width,
      height: FALLBACK_LABEL_DIMENSIONS[body.id].height,
      inFrustum: false,
    })),
  );
  const resolvedBufferRef = useRef<ResolvedLabelLayout[]>(
    SOLAR_SYSTEM_BODIES.map((body) => ({
      id: body.id,
      x: 0,
      y: 0,
      width: FALLBACK_LABEL_DIMENSIONS[body.id].width,
      height: FALLBACK_LABEL_DIMENSIONS[body.id].height,
      inFrustum: false,
      visible: false,
      suppressed: false,
    })),
  );

  useFrame(() => {
    camera.updateMatrixWorld();
    const candidatesBuffer = candidatesBufferRef.current;
    const resolvedBuffer = resolvedBufferRef.current;
    const bodyCount = SOLAR_SYSTEM_BODIES.length;
    for (let index = 0; index < bodyCount; index += 1) {
      const body = SOLAR_SYSTEM_BODIES[index];
      const candidate = candidatesBuffer[index];
      const dims = getLabelDimensions(body.id);
      candidate.id = body.id;
      candidate.width = dims.width;
      candidate.height = dims.height;

      const [x, y, z] = getScenePosition(body.id, julianDate, elapsedDays);
      const labelHeight = y + body.displayRadius + (body.id === 'sun' ? 1.9 : 0.68);
      point.set(x, labelHeight, z).project(camera);

      if (point.z < -1 || point.z > 1) {
        candidate.x = 0;
        candidate.y = 0;
        candidate.inFrustum = false;
        continue;
      }

      const screenX = (point.x * 0.5 + 0.5) * size.width;
      const screenY = (-point.y * 0.5 + 0.5) * size.height;
      const halfWidth = dims.width * 0.5;
      if (
        screenX - halfWidth < 0 ||
        screenX + halfWidth > size.width ||
        screenY - dims.height < 0 ||
        screenY > size.height
      ) {
        candidate.x = screenX;
        candidate.y = screenY;
        candidate.inFrustum = false;
        continue;
      }

      candidate.x = screenX;
      candidate.y = screenY;
      candidate.inFrustum = true;
    }

    const singleSelectedLabelOnly =
      size.width <= COMPACT_LABEL_VIEWPORT_MAX_WIDTH_PX ||
      (typeof window !== 'undefined' &&
        window.innerWidth <= COMPACT_LABEL_VIEWPORT_MAX_WIDTH_PX);

    resolveSolarSystemLabelCollisions(candidatesBuffer, selectedId, {
      marginPx: LABEL_COLLISION_MARGIN_PX,
      singleSelectedLabelOnly,
      out: resolvedBuffer,
    });

    onUpdate(resolvedBuffer);
  });

  return null;
}

function SaturnRing({ body }: { body: SolarSystemBody }) {
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
  position,
  selected,
  onSelect,
}: {
  body: SolarSystemBody;
  position: [number, number, number];
  selected: boolean;
  onSelect: (id: SolarSystemBodyId) => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const reticleRef = useRef<Group>(null);
  const texture = useLocalTexture(body.texture?.localPath ?? null);
  const isGasGiant = body.kind === 'gas-giant' || body.kind === 'ice-giant';
  const surface = planetSurfaceState(texture, body.fallbackColor);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      const spin = SPIN_RATES[body.id] ?? 0.2;
      meshRef.current.rotation.y += spin * delta;
    }
    if (reticleRef.current && selected) {
      reticleRef.current.rotation.y += 0.75 * delta;
      reticleRef.current.rotation.z += 0.35 * delta;
    }
  });

  const axialTilt = AXIAL_TILTS[body.id] ?? 0;

  return (
    <group position={position}>
      {/* Axial tilt frame for planetary spin and rings */}
      <group rotation={[axialTilt, 0, 0]}>
        <mesh
          ref={meshRef}
          name={`overview-${body.id}`}
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

        {body.ring ? <SaturnRing body={body} /> : null}
      </group>

      {/* Dynamic Animated Selection Aura & Reticle */}
      {selected ? (
        <group ref={reticleRef}>
          <mesh scale={1.24} renderOrder={0}>
            <sphereGeometry args={[body.displayRadius, 28, 20]} />
            <meshBasicMaterial
              color="#b9f5ff"
              transparent
              opacity={0.14}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[body.displayRadius * 1.36, body.displayRadius * 1.44, 48]}
            />
            <meshBasicMaterial
              color="#7bd7e8"
              transparent
              opacity={0.6}
              depthWrite={false}
              side={DoubleSide}
              blending={AdditiveBlending}
            />
          </mesh>
        </group>
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
  const coronaRef = useRef<Mesh>(null);
  const flareRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (coronaRef.current) {
      const pulse = 1.18 + Math.sin(t * 1.5) * 0.04;
      coronaRef.current.scale.set(pulse, pulse, pulse);
    }
    if (flareRef.current) {
      flareRef.current.rotation.z += 0.12 * delta;
      flareRef.current.rotation.y += 0.06 * delta;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 48 + Math.sin(t * 2.0) * 3.0;
    }
  });

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

      {/* Dynamic Animated Coronal Atmosphere */}
      <mesh ref={coronaRef} scale={1.2}>
        <sphereGeometry args={[body.displayRadius, 40, 28]} />
        <meshBasicMaterial
          color="#ff9a3c"
          transparent
          opacity={0.15}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Dynamic Solar Flare Ring */}
      <mesh ref={flareRef} scale={1.35}>
        <ringGeometry
          args={[body.displayRadius * 1.05, body.displayRadius * 1.35, 64]}
        />
        <meshBasicMaterial
          color="#ffaa33"
          transparent
          opacity={0.07}
          side={DoubleSide}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        color="#ffe0b2"
        intensity={48}
        distance={80}
        decay={2}
      />

      {selected ? (
        <mesh scale={1.42}>
          <sphereGeometry args={[body.displayRadius, 36, 24]} />
          <meshBasicMaterial
            color="#fff0c0"
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function MotionTrails({
  julianDate,
  elapsedDays,
  selectedId,
}: {
  julianDate?: number;
  elapsedDays: number;
  selectedId: SolarSystemBodyId;
}) {
  const [trailMap, setTrailMap] = useState<Map<SolarSystemBodyId, [number, number, number][]>>(
    () => new Map(),
  );
  const lastTimeRef = useRef<number | null>(null);

  const currentTime =
    typeof julianDate === 'number' && Number.isFinite(julianDate)
      ? julianDate
      : elapsedDays;

  useEffect(() => {
    setTrailMap((prev) => {
      const next = new Map(prev);
      if (lastTimeRef.current !== null && Math.abs(currentTime - lastTimeRef.current) > 2.5) {
        next.clear();
      }
      lastTimeRef.current = currentTime;

      const nonSunBodies = SOLAR_SYSTEM_BODIES.filter((body) => body.id !== 'sun');
      for (const body of nonSunBodies) {
        const pos = getScenePosition(body.id, julianDate, elapsedDays);
        const existing = next.get(body.id) ?? [];
        const last = existing[existing.length - 1];
        if (!last || Math.hypot(pos[0] - last[0], pos[1] - last[1], pos[2] - last[2]) > 0.04) {
          const updated = [...existing, pos];
          if (updated.length > 36) {
            updated.shift();
          }
          next.set(body.id, updated);
        }
      }
      return next;
    });
  }, [currentTime, julianDate, elapsedDays]);

  const nonSunBodies = SOLAR_SYSTEM_BODIES.filter((body) => body.id !== 'sun');

  return (
    <group>
      {nonSunBodies.map((body) => {
        const pts = trailMap.get(body.id) ?? [];
        if (pts.length < 2) {
          return null;
        }
        const v3Points = pts.map(([x, y, z]) => new Vector3(x, y, z));
        const isSelected = body.id === selectedId;
        return (
          <Line
            key={`trail-${body.id}`}
            points={v3Points}
            color={body.accentColor}
            transparent
            opacity={isSelected ? 0.75 : 0.28}
            lineWidth={isSelected ? 2.0 : 1.0}
          />
        );
      })}
    </group>
  );
}

export type SolarSystemViewportProps = {
  selectedId: SolarSystemBodyId;
  focusMode: CameraFocusMode;
  focusSignal: number;
  elapsedDays?: number;
  julianDate?: number;
  showTrails?: boolean;
  onToggleTrails?: () => void;
  onSelect: (id: SolarSystemBodyId) => void;
  onBennuMeshStatusChange?: (status: BennuMeshStatus) => void;
};

export function SolarSystemViewport({
  selectedId,
  focusMode,
  focusSignal,
  elapsedDays = 0,
  julianDate,
  showTrails = false,
  onToggleTrails,
  onSelect,
  onBennuMeshStatusChange,
}: SolarSystemViewportProps) {
  const [bennuMeshStatus, setBennuMeshStatus] =
    useState<BennuMeshStatus>('procedural-overview');
  const labelRefs = useRef<LabelRefMap>({});
  const labelDimensionsRef = useRef<
    Record<SolarSystemBodyId, { width: number; height: number }>
  >({
    sun: { ...FALLBACK_LABEL_DIMENSIONS.sun },
    mercury: { ...FALLBACK_LABEL_DIMENSIONS.mercury },
    venus: { ...FALLBACK_LABEL_DIMENSIONS.venus },
    earth: { ...FALLBACK_LABEL_DIMENSIONS.earth },
    mars: { ...FALLBACK_LABEL_DIMENSIONS.mars },
    jupiter: { ...FALLBACK_LABEL_DIMENSIONS.jupiter },
    saturn: { ...FALLBACK_LABEL_DIMENSIONS.saturn },
    uranus: { ...FALLBACK_LABEL_DIMENSIONS.uranus },
    neptune: { ...FALLBACK_LABEL_DIMENSIONS.neptune },
    bennu: { ...FALLBACK_LABEL_DIMENSIONS.bennu },
  });
  const measuredMaskRef = useRef<Partial<Record<SolarSystemBodyId, boolean>>>({});

  const handleBennuMeshStatusChange = useCallback(
    (status: BennuMeshStatus) => {
      setBennuMeshStatus(status);
      onBennuMeshStatusChange?.(status);
    },
    [onBennuMeshStatusChange],
  );

  useEffect(() => {
    const handleResize = (): void => {
      measuredMaskRef.current = {};
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getLabelDimensions = useCallback((id: SolarSystemBodyId) => {
    if (!measuredMaskRef.current[id]) {
      const element = labelRefs.current[id];
      if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
        labelDimensionsRef.current[id] = {
          width: element.offsetWidth,
          height: element.offsetHeight,
        };
        measuredMaskRef.current[id] = true;
      }
    }
    return labelDimensionsRef.current[id];
  }, []);

  const updateLabels = useCallback((layouts: readonly ResolvedLabelLayout[]) => {
    for (let index = 0; index < layouts.length; index += 1) {
      const layout = layouts[index];
      const element = labelRefs.current[layout.id];
      if (!element) {
        continue;
      }

      if (layout.inFrustum || layout.visible || layout.suppressed) {
        element.style.transform = `translate(${layout.x}px, ${layout.y}px) translate(-50%, -100%)`;
      }

      const nextVisibility = layout.visible ? 'visible' : 'hidden';
      if (element.style.visibility !== nextVisibility) {
        element.style.visibility = nextVisibility;
      }

      const nextPointerEvents = layout.visible ? '' : 'none';
      if (element.style.pointerEvents !== nextPointerEvents) {
        element.style.pointerEvents = nextPointerEvents;
      }

      const nextVisibleAttr = layout.visible ? 'true' : 'false';
      if (element.dataset.labelVisible !== nextVisibleAttr) {
        element.dataset.labelVisible = nextVisibleAttr;
      }

      const nextSuppressedAttr = layout.suppressed ? 'true' : 'false';
      if (element.dataset.labelSuppressed !== nextSuppressedAttr) {
        element.dataset.labelSuppressed = nextSuppressedAttr;
      }
    }
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
          near={0.1}
          far={5000}
        />

        <CameraFocus
          focusMode={focusMode}
          selectedId={selectedId}
          focusSignal={focusSignal}
          elapsedDays={elapsedDays}
          julianDate={julianDate}
        />
        <LabelProjector
          elapsedDays={elapsedDays}
          julianDate={julianDate}
          selectedId={selectedId}
          getLabelDimensions={getLabelDimensions}
          onUpdate={updateLabels}
        />

        <Sun selected={selectedId === 'sun'} onSelect={onSelect} />

        {SOLAR_SYSTEM_BODIES.filter((body) => body.id !== 'sun').map((body) => (
          <OrbitGuide
            key={`orbit-${body.id}`}
            body={body}
            julianDate={julianDate}
            selected={body.id === selectedId}
          />
        ))}

        {SOLAR_SYSTEM_BODIES.filter((body) => body.id !== 'sun').map((body) => {
          const pos = getScenePosition(body.id, julianDate, elapsedDays);
          return body.id === 'bennu' ? (
            <BennuAsteroidModel
              key={body.id}
              body={body}
              position={pos}
              selected={body.id === selectedId}
              focusMode={focusMode}
              onSelect={onSelect}
              onMeshStatusChange={handleBennuMeshStatusChange}
            />
          ) : (
            <PlanetBody
              key={body.id}
              body={body}
              position={pos}
              selected={body.id === selectedId}
              onSelect={onSelect}
            />
          );
        })}

        {showTrails ? (
          <MotionTrails
            julianDate={julianDate}
            elapsedDays={elapsedDays}
            selectedId={selectedId}
          />
        ) : null}

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={0.9}
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
        <span className="ss-badge">
          {typeof julianDate === 'number'
            ? 'ASTRONOMICAL OBSERVATORY'
            : 'REFERENCE VISUALIZATION'}
        </span>
        <p className="ss-viewport__hint">
          {typeof julianDate === 'number'
            ? 'Standish / JPL Keplerian Positions · J2000 Ecliptic Frame'
            : elapsedDays === 0
              ? 'Static schematic layout · no ephemeris or dynamics'
              : 'Illustrative schematic motion · not an ephemeris'}
        </p>
      </div>

      <div className="ss-viewport__overlay ss-viewport__overlay--top-right">
        <div className="ss-viewport__top-right-row">
          <p className="ss-viewport__hint">Drag to orbit · scroll to zoom</p>
          {onToggleTrails ? (
            <button
              type="button"
              className={showTrails ? 'ss-trail-btn is-active' : 'ss-trail-btn'}
              aria-pressed={Boolean(showTrails)}
              onClick={onToggleTrails}
              title={showTrails ? 'Disable dynamic motion trails' : 'Enable dynamic motion trails'}
              data-testid="toggle-trails-btn"
            >
              {showTrails ? 'Trails: ON' : 'Trails: OFF'}
            </button>
          ) : null}
        </div>
        {selectedId === 'bennu' && focusMode === 'body' ? (
          <span
            className={
              bennuMeshStatus === 'fallback'
                ? 'ss-badge ss-badge--muted'
                : 'ss-badge'
            }
            data-testid="bennu-mesh-status"
            title={BENNU_MODEL.renderNote}
          >
            {bennuMeshStatus === 'fallback'
              ? 'Bennu mesh unavailable · procedural rocky fallback'
              : bennuMeshStatus === 'ready'
                ? 'NASA VTAD Bennu mesh · exaggerated display scale'
                : 'Loading NASA Bennu mesh · procedural rocky fallback'}
          </span>
        ) : null}
      </div>

      <div className="ss-viewport__overlay ss-viewport__overlay--bottom-left">
        <span className="ss-badge ss-badge--muted">
          {typeof julianDate === 'number'
            ? 'MONOTONIC POWER-LAW SCALE (r^0.6)'
            : 'NOT TO SCALE'}
        </span>
        <p className="ss-viewport__hint">
          {typeof julianDate === 'number'
            ? 'Radial distances compressed by power-law for multi-planet legibility. True AU and km shown in details.'
            : 'Body sizes, orbit spacing, and positions are composed for legibility.'}
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
        {selectedId === 'bennu' ? (
          <>
            <span className="ss-viewport__credit-separator"> · </span>
            <a
              className="ss-viewport__credit"
              data-testid="bennu-model-credit"
              href={BENNU_MODEL.sourcePageUrl}
              target="_blank"
              rel="noreferrer"
              title={BENNU_MODEL.creditDetail}
            >
              Bennu 3D model: NASA VTAD
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
