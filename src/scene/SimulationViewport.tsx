/**
 * The 3D viewport.
 *
 * It renders exactly what the physics engine returned: the central body at the
 * frame origin (the model's fixed force center), the recorded trajectory, and
 * the particle marker at the currently selected recorded sample.
 *
 * Display-only transformations (scene units, marker size) are documented in
 * displayScale.ts and never feed back into the simulation.
 */

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, OrbitControls, PerspectiveCamera } from '@react-three/drei';

import type { SimulationResult } from '../simulation';
import { EarthSphere } from './EarthSphere';
import { ParticleMarker } from './ParticleMarker';
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

export function SimulationViewport({
  result,
  sampleIndex,
  bodyRadiusKm,
  sceneExtentKm,
}: SimulationViewportProps) {
  const sampleCount = result.samples.length;
  const safeIndex = Math.min(Math.max(sampleIndex, 0), Math.max(sampleCount - 1, 0));
  const sample = result.samples[safeIndex];

  const bodyRadiusUnits = toSceneUnits(bodyRadiusKm);
  const sceneExtentUnits = toSceneUnits(sceneExtentKm);
  const markerRadiusUnits = Math.max(bodyRadiusUnits * 0.012, sceneExtentUnits * 0.008);
  const markerPosition = toScenePoint(sample.state.positionKm);

  // Camera fit for the current run. Declarative props are only re-applied when
  // these values change, so a user's orbit/zoom survives playback frames.
  const cameraFit = useMemo(() => {
    const distance = Math.max(sceneExtentUnits * 3.6, 22);
    return {
      position: [distance * 0.3, distance * 0.45, distance * 0.84] as [
        number,
        number,
        number,
      ],
      near: Math.max(distance / 2000, 0.005),
      far: distance * 400,
    };
  }, [sceneExtentUnits]);

  const stopWarning = result.warnings.find(
    (warning) => warning.timeSeconds <= sample.timeSeconds + 1e-9,
  );

  return (
    <div className="viewport">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#060b14']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[40, 26, 30]} intensity={1.7} />
        <directionalLight position={[-30, -14, -24]} intensity={0.35} color="#5ad1e6" />

        <PerspectiveCamera
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
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0, 0]}
          minDistance={bodyRadiusUnits * 1.02}
          maxDistance={Math.max(sceneExtentUnits * 12, 40)}
        />

        <GizmoHelper alignment="bottom-right" margin={[68, 68]}>
          <GizmoViewport axisColors={['#f0736a', '#7ee081', '#6aa9f0']} labelColor="#04121f" />
        </GizmoHelper>
      </Canvas>

      <div className="viewport__overlay viewport__overlay--top-left">
        <span className="badge badge--warn" title={DISPLAY_SCALE_NOTE}>
          NOT TO SCALE
        </span>
        <p className="viewport__hint">{DISPLAY_SCALE_NOTE}</p>
      </div>

      <div className="viewport__overlay viewport__overlay--top-right">
        <p className="viewport__stat">
          Axes: Earth-centered inertial (+z = north)
        </p>
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
