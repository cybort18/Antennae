import { Texture } from 'three';
import { describe, expect, it } from 'vitest';

import { planetSurfaceState } from '../planetSurface';

describe('planetSurfaceState', () => {
  it('uses a loaded local texture with a neutral material colour', () => {
    const texture = new Texture();
    const state = planetSurfaceState(texture, '#123456');

    expect(state.map).toBe(texture);
    expect(state.color).toBe('#ffffff');
    expect(state.usesFallback).toBe(false);
  });

  it('keeps the procedural fallback when the texture is unavailable', () => {
    const state = planetSurfaceState(null, '#a95336');

    expect(state.map).toBeNull();
    expect(state.color).toBe('#a95336');
    expect(state.usesFallback).toBe(true);
  });
});
