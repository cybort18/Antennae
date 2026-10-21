/**
 * Display-only material selection for overview planets.
 *
 * A loaded local texture replaces the fallback colour. A missing or failed
 * texture leaves the procedural sphere intact; it never removes the body or
 * affects the Earth Orbit Lab.
 */

import type { Texture } from 'three';

export type PlanetSurfaceState = {
  map: Texture | null;
  color: string;
  usesFallback: boolean;
};

export function planetSurfaceState(
  texture: Texture | null,
  fallbackColor: string,
): PlanetSurfaceState {
  if (texture) {
    return { map: texture, color: '#ffffff', usesFallback: false };
  }

  return { map: null, color: fallbackColor, usesFallback: true };
}
