/**
 * Local texture loading with an explicit unavailable path.
 *
 * Scene assets are display-only. Keeping the loader separate makes it possible
 * to test that a missing or corrupt texture resolves to `null` instead of
 * rejecting into the React tree; the caller can then keep the procedural Earth.
 */

import { SRGBColorSpace, type Texture, type TextureLoader } from 'three';

type TextureLoaderSubset = Pick<TextureLoader, 'load'>;

/**
 * Loads one texture and resolves to `null` on any load error.
 *
 * `colorSpace` defaults to sRGB for colour maps. Data/alpha maps (such as the
 * static cloud layer) pass `NoColorSpace` so their intensity values are not
 * gamma-decoded as colour.
 *
 * The callback wrapper also protects against a loader implementation invoking
 * both success and error callbacks, which would otherwise settle twice.
 */
export function loadLocalTexture(
  loader: TextureLoaderSubset,
  url: string,
  colorSpace: Texture['colorSpace'] = SRGBColorSpace,
): Promise<Texture | null> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (texture: Texture | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (texture) {
        texture.colorSpace = colorSpace;
      }
      resolve(texture);
    };

    try {
      loader.load(
        url,
        (texture) => finish(texture),
        undefined,
        () => finish(null),
      );
    } catch {
      finish(null);
    }
  });
}
