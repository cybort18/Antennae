/**
 * Display-only coordinate transform for the 3D viewport.
 *
 * The simulation works in kilometres. The viewport draws in scene units with one
 * uniform scale factor, so relative orbital geometry (Earth radius versus orbit
 * radius) keeps its real proportions.
 *
 * This transform is one-way: scene units are never converted back into physical
 * values, and nothing here may influence simulation state.
 *
 * Marker sizes and line widths ARE exaggerated for visibility; the viewport is
 * therefore labelled NOT TO SCALE.
 */

import type { Vec3 } from '../simulation';

/** 1 scene unit = 1,000 km. */
export const SCENE_UNITS_PER_KILOMETRE = 1 / 1000;

export function toSceneUnits(kilometres: number): number {
  return kilometres * SCENE_UNITS_PER_KILOMETRE;
}

/** Converts a physical position (km) to scene units as a plain tuple. */
export function toScenePoint(positionKm: Vec3): [number, number, number] {
  return [
    toSceneUnits(positionKm.x),
    toSceneUnits(positionKm.y),
    toSceneUnits(positionKm.z),
  ];
}

/** Human-readable description of the display scale, for disclosure in the UI. */
export const DISPLAY_SCALE_NOTE =
  'Display scale: 1 scene unit = 1,000 km. Positions and the central body radius share this uniform scale; the marker size and line widths are exaggerated for visibility.';
