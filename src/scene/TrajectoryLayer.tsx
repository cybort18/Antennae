/**
 * Trajectory rendering.
 *
 * Two layers, both built from the engine's recorded samples only:
 * - the full path of the current run (dim), and
 * - the portion already played back (bright), updated through a geometry draw
 *   range so playback costs no per-frame allocation.
 *
 * No curve fitting, smoothing, or interpolation is applied: the line connects
 * the recorded sample positions in order.
 */

import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';

import type { SimulationResult } from '../simulation';
import { toScenePoint } from './displayScale';

export const TrajectoryLayer = memo(function TrajectoryLayer({
  result,
  traveledCount,
}: {
  result: SimulationResult;
  traveledCount: number;
}) {
  const fullLine = useMemo(() => {
    const positions = new Float32Array(result.samples.length * 3);
    result.samples.forEach((sample, index) => {
      const [x, y, z] = toScenePoint(sample.state.positionKm);
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: '#5b93c8',
      transparent: true,
      opacity: 0.35,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    return line;
  }, [result]);

  useEffect(
    () => () => {
      fullLine.geometry.dispose();
      (fullLine.material as THREE.Material).dispose();
    },
    [fullLine],
  );

  return (
    <group name="trajectory">
      {/* Complete recorded path of the current run (dim). */}
      <primitive object={fullLine} />
      {/* Portion already played back (bright). */}
      <TraveledLayer result={result} traveledCount={traveledCount} />
    </group>
  );
});

const TraveledLayer = memo(function TraveledLayer({
  result,
  traveledCount,
}: {
  result: SimulationResult;
  traveledCount: number;
}) {
  const line = useMemo(() => {
    const positions = new Float32Array(result.samples.length * 3);
    result.samples.forEach((sample, index) => {
      const [x, y, z] = toScenePoint(sample.state.positionKm);
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: '#c8fbff' });
    const object = new THREE.Line(geometry, material);
    object.frustumCulled = false;
    return object;
  }, [result]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );

  useEffect(() => {
    const count = Math.max(Math.min(traveledCount, result.samples.length), 1);
    line.geometry.setDrawRange(0, count);
  }, [line, traveledCount, result.samples.length]);

  return <primitive object={line} />;
});
