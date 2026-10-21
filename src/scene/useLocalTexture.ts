/**
 * React binding for the local texture loader.
 *
 * The hook is intentionally small and uses the same null-on-failure loader as
 * the Earth sphere. A caller can therefore keep a procedural material when a
 * curated display asset is missing or corrupt.
 */

import { useEffect, useState } from 'react';
import { SRGBColorSpace, TextureLoader, type Texture } from 'three';

import { loadLocalTexture } from './textureLoading';

export function useLocalTexture(
  url: string | null,
  colorSpace: Texture['colorSpace'] = SRGBColorSpace,
): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let active = true;
    if (!url) {
      return () => {
        active = false;
      };
    }

    const loader = new TextureLoader();
    void loadLocalTexture(loader, url, colorSpace).then((next) => {
      if (!active) {
        next?.dispose();
        return;
      }
      setTexture(next);
    });

    return () => {
      active = false;
    };
  }, [colorSpace, url]);

  useEffect(
    () => () => {
      texture?.dispose();
    },
    [texture],
  );

  return url ? texture : null;
}
