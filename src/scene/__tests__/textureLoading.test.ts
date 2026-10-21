/**
 * Texture loader fallback tests.
 *
 * The scene must stay usable when a local texture is missing or unreadable. The
 * real Three.js loader needs WebGL and an image decode, so these tests use a
 * tiny callback-compatible double and pin the contract the scene relies on.
 */

import { NoColorSpace, SRGBColorSpace, Texture, type TextureLoader } from 'three';
import { describe, expect, it } from 'vitest';

import { loadLocalTexture } from '../textureLoading';

type Loader = Pick<TextureLoader, 'load'>;

function loaderThatCalls(
  call: 'success' | 'error' | 'throw',
  texture: Texture,
): Loader {
  return {
    load: (
      _url: string,
      onLoad?: (data: Texture) => void,
      _onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (err: unknown) => void,
    ) => {
      if (call === 'success') {
        onLoad?.(texture);
      } else if (call === 'error') {
        onError?.(new Error('missing texture'));
      } else {
        throw new Error('loader construction failed');
      }
      return texture;
    },
  } as unknown as Loader;
}

describe('loadLocalTexture', () => {
  it('resolves the loaded texture and marks it as sRGB', async () => {
    const texture = new Texture();
    const result = await loadLocalTexture(
      loaderThatCalls('success', texture),
      '/assets/earth/blue-marble-2048.jpg',
    );

    expect(result).toBe(texture);
    expect(texture.colorSpace).toBe(SRGBColorSpace);
  });

  it('does not gamma-decode an alpha/data map', async () => {
    const texture = new Texture();
    const result = await loadLocalTexture(
      loaderThatCalls('success', texture),
      '/assets/earth/blue-marble-clouds-2048.jpg',
      NoColorSpace,
    );

    expect(result).toBe(texture);
    expect(texture.colorSpace).toBe(NoColorSpace);
  });

  it('resolves null instead of rejecting when the asset fails', async () => {
    await expect(
      loadLocalTexture(
        loaderThatCalls('error', new Texture()),
        '/assets/earth/missing.jpg',
      ),
    ).resolves.toBeNull();
  });

  it('resolves null when the loader itself throws', async () => {
    await expect(
      loadLocalTexture(
        loaderThatCalls('throw', new Texture()),
        '/assets/earth/missing.jpg',
      ),
    ).resolves.toBeNull();
  });
});
