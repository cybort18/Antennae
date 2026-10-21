/**
 * The 3D viewport.
 *
 * It renders exactly what the physics engine returned: the central body at the
 * frame origin (the model's fixed force center), the recorded trajectory, and
 * the particle marker at the currently selected recorded sample.
 *
 * Display-only choices (scene units, marker size, camera framing, textures, and
 * the static star field) are documented in displayScale.ts and never feed back
 * into the simulation. The Orbit/Earth camera buttons only reframe the same
 * recorded scene; they do not change physical coordinates or camera scale data.
 */

import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, OrbitControls, PerspectiveCamera } from '@react-three/drei';

import { Button } from '../components/ui';
import type { SimulationResult } from '../simulation';
import { EarthSphere } from './EarthSphere';
import { ParticleMarker } from './ParticleMarker';
import { Starfield } from './Starfield';
import { TrajectoryLayer } from './TrajectoryLayer';
import { DISPLAY_SCALE_NOTE, toScenePoint, toSceneUnits } from './displayScale';

export type SimulationViewportProps = {
  result: SimulationResult;
  /** Index of the recorded sample to draw; clamped defensively. */
  sampleIndex: number;
  /** Reference body radius used for the drawn sphere, km. */
  bodyRadiusKm: number;
  /** Largest sampled radius of the current run, km (used to frame the camera). */
  sceneExtentKm: number;
};

type CameraMode = 'orbit' | 'earth';

export function SimulationViewport({
  result,
  sampleIndex,
  bodyRadiusKm,
  sceneExtentKm,
}: SimulationViewportProps) {
  const sampleCount = result.samples.length;
  const safeIndex = Math.min(Math.max(sampleIndex, 0), Math.max(sampleCount - 1, 0));
  const sample = result.samples[safeIndex];
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');

  const bodyRadiusUnits = toSceneUnits(bodyRadiusKm);
  const sceneExtentUnits = toSceneUnits(sceneExtentKm);
  const markerRadiusUnits = Math.max(bodyRadiusUnits * 0.009, sceneExtentUnits * 0.006);
  const markerPosition = toScenePoint(sample.state.positionKm);

  // Framing is a display concern. "Orbit" fits the recorded path; "Earth" keeps
  // the fixed-force-centre close-up usable for GEO-scale runs. Neither changes
  // the sampled coordinates or the physical camera distance recorded anywhere.
  const cameraFit = useMemo(() => {
    const distance =
      cameraMode === 'earth'
        ? Math.max(bodyRadiusUnits * 3.35, 18)
        : Math.max(sceneExtentUnits * 2.9, bodyRadiusUnits * 4, 24);

    return {
      position: [distance * 0.27, distance * 0.42, distance * 0.86] as [
        number,
        number,
        number,
      ],
      near: Math.max(distance / 2500, 0.005),
      far: Math.max(distance * 500, 3000),
      maxDistance: Math.max(sceneExtentUnits * 14, distance * 3, 60),
    };
  }, [bodyRadiusUnits, cameraMode, sceneExtentUnits]);

  const stopWarning = result.warnings.find(
    (warning) => warning.timeSeconds <= sample.timeSeconds + 1e-9,
  );

  return (
    <div className="viewport">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#02050a']} />
        <ambientLight intensity={0.34} />
        <directionalLight position={[30, 30, 72]} intensity={1.55} color="#fff2de" />
        <directionalLight position={[-46, -18, -34]} intensity={0.25} color="#4b89ff" />

        <Starfield />

        <PerspectiveCamera
          key={`camera-${cameraMode}`}
          makeDefault
          fov={45}
          near={cameraFit.near}
          far={cameraFit.far}
          position={cameraFit.position}
        />

        <EarthSphere radiusUnits={bodyRadiusUnits} />
        <TrajectoryLayer result={result} traveledCount={safeIndex + 1} />
        <ParticleMarker position={markerPosition} radiusUnits={markerRadiusUnits} />

        <OrbitControls
          key={`controls-${cameraMode}`}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0, 0]}
          minDistance={bodyRadiusUnits * 1.02}
          maxDistance={cameraFit.maxDistance}
        />

        <GizmoHelper alignment="bottom-right" margin={[376, 190]}>
          <GizmoViewport axisColors={['#f0736a', '#7ee081', '#6aa9f0']} labelColor="#04121f" />
        </GizmoHelper>
      </Canvas>

      <div className="viewport__vignette" aria-hidden="true" />

      <div className="viewport__overlay viewport__overlay--top-left viewport__overlay--interactive">
        <div className="viewport__mode" role="group" aria-label="Camera framing">
          <span className="viewport__mode-label">Frame</span>
          <Button
            variant={cameraMode === 'orbit' ? 'primary' : 'ghost'}
            ariaPressed={cameraMode === 'orbit'}
            onClick={() => setCameraMode('orbit')}
            title="Fit the recorded orbit in the viewport"
          >
            Orbit
          </Button>
          <Button
            variant={cameraMode === 'earth' ? 'primary' : 'ghost'}
            ariaPressed={cameraMode === 'earth'}
            onClick={() => setCameraMode('earth')}
            title="Zoom toward the fixed central body"
          >
            Earth
          </Button>
        </div>
        <div className="viewport__scale-note">
          <span className="badge badge--warn" title={DISPLAY_SCALE_NOTE}>
            NOT TO SCALE
          </span>
          <p className="viewport__hint">{DISPLAY_SCALE_NOTE}</p>
        </div>
      </div>

      <div className="viewport__overlay viewport__overlay--top-right">
        <p className="viewport__stat">Axes: Earth-centered inertial (+z = north)</p>
        <p className="viewport__hint">Drag to orbit · scroll to zoom</p>
      </div>

      <div className="viewport__overlay viewport__overlay--bottom-left">
        <ul className="legend">
          <li>
            <span className="legend__swatch legend__swatch--body" /> Earth (fixed force centre)
          </li>
          <li>
            <span className="legend__swatch legend__swatch--traveled" /> Played-back samples
          </li>
          <li>
            <span className="legend__swatch legend__swatch--path" /> Full recorded path
          </li>
          <li>
            <span className="legend__swatch legend__swatch--marker" /> Test particle (recorded sample)
          </li>
        </ul>
        <p className="viewport__credit">
          <a
            data-testid="imagery-credit"
            href="https://earthobservatory.nasa.gov/features/BlueMarble"
            target="_blank"
            rel="noreferrer"
          >
            Earth imagery: NASA Blue Marble
          </a>
        </p>
      </div>

      {result.status === 'stopped' && stopWarning ? (
        <div className="viewport__overlay viewport__overlay--bottom-right">
          <div className="badge badge--danger" title={stopWarning.message}>
            Run stopped · {stopWarning.code}
          </div>
        </div>
      ) : null}
    </div>
  );
}
