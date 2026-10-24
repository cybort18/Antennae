/**
 * Render-only model association, lazy loader, normalization, and resource
 * disposal for asteroid 101955 Bennu in the Solar System Overview.
 *
 * This module is strictly presentation-only. It never imports from
 * `src/simulation/`, `src/missions/`, or `src/comparison/`, and its geometry,
 * bounds, and load state never alter physical reference facts, schematic
 * positions, or simulation outputs.
 */

import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import {
  GLTFLoader,
  type GLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  BENNU_MODEL,
  type CameraFocusMode,
  type SolarSystemBodyId,
  type SolarSystemModelAsset,
} from '../solarSystem/bodies';

export { BENNU_MODEL };

export type BennuMeshStatus =
  | 'procedural-overview'
  | 'loading'
  | 'ready'
  | 'fallback';

export type GltfArrayBufferParser = {
  parse: (
    data: ArrayBuffer,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (error: unknown) => void,
  ) => void;
};

/**
 * Returns the official Bennu 3D model asset only when Bennu is actively
 * selected and focused in the Overview (`selectedId === 'bennu'` and
 * `focusMode === 'body'`). At the wide system view (`focusMode === 'overview'`)
 * or when any other body is selected, returns `null` so startup and wide
 * overview rendering fetch zero bytes of Bennu mesh data.
 */
export function bennuModelForOverviewState(
  selectedId: SolarSystemBodyId,
  focusMode: CameraFocusMode,
): SolarSystemModelAsset | null {
  if (selectedId === 'bennu' && focusMode === 'body') {
    return BENNU_MODEL;
  }
  return null;
}

/**
 * Disposes geometries, materials, and textures owned by an Object3D hierarchy.
 */
export function disposeObject3DResources(
  root: Object3D | null | undefined,
  options?: { disposeTextures?: boolean },
): void {
  if (!root) {
    return;
  }
  const disposeTextures = options?.disposeTextures ?? true;
  const textureKeys = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'aoMap',
    'emissiveMap',
  ] as const;

  const disposeMaterial = (material: Material): void => {
    if (disposeTextures) {
      const record = material as unknown as Record<string, unknown>;
      for (const key of textureKeys) {
        const candidate = record[key];
        if (candidate instanceof Texture) {
          candidate.dispose();
        }
      }
    }
    material.dispose();
  };

  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (Array.isArray(object.material)) {
      for (const material of object.material) {
        if (material) {
          disposeMaterial(material);
        }
      }
    } else if (object.material) {
      disposeMaterial(object.material);
    }
  });
}

/**
 * Normalizes a loaded Bennu Object3D for visual legibility in scene units.
 * Clones geometries and materials so disposing the normalized instance does not
 * mutate a caller's source object.
 */
export function normalizeBennuScene(
  source: Object3D,
  displayRadiusUnits: number,
): Object3D {
  const model = source.clone(true);

  model.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    if (object.geometry) {
      object.geometry = object.geometry.clone();
    }
    const cloneAndTuneMaterial = (material: Material): Material => {
      const cloned = material.clone();
      if (cloned instanceof MeshStandardMaterial) {
        cloned.emissive.set('#1a1612');
        cloned.emissiveIntensity = 0.36;
        cloned.metalness = Math.min(cloned.metalness, 0.08);
        cloned.roughness = Math.max(cloned.roughness, 0.92);
        cloned.needsUpdate = true;
      }
      return cloned;
    };

    if (Array.isArray(object.material)) {
      object.material = object.material.map(cloneAndTuneMaterial);
    } else if (object.material) {
      object.material = cloneAndTuneMaterial(object.material);
    }
  });

  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  if (maxDimension > 0 && Number.isFinite(maxDimension)) {
    // Apparent diameter is scaled to 2.4x displayRadiusUnits so Bennu's
    // spinning-top equatorial ridge and boulders are clearly inspectable when
    // focused. This is a one-way visual scale only.
    const targetDiameterUnits = Math.max(displayRadiusUnits * 2.4, 0.44);
    const scale = targetDiameterUnits / maxDimension;
    model.scale.setScalar(scale);
    model.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    );
  }

  model.updateMatrixWorld(true);
  return model;
}

/**
 * Fetches and parses the local Bennu GLB asset. Resolves `null` instead of
 * throwing when the network request fails, returns a non-OK HTTP status, or
 * fails glTF parsing, so the caller can keep the procedural faceted fallback.
 */
export async function loadBennuModelScene(
  url: string = BENNU_MODEL.localPath,
  options?: {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    createParser?: () => GltfArrayBufferParser;
  },
): Promise<Object3D | null> {
  const fetchFn = options?.fetchImpl ?? fetch;
  const createParser = options?.createParser ?? (() => new GLTFLoader());

  try {
    const response = await fetchFn(url, { signal: options?.signal });
    if (!response.ok) {
      throw new Error(`Bennu mesh request failed with HTTP ${response.status}.`);
    }
    const buffer = await response.arrayBuffer();
    if (options?.signal?.aborted) {
      return null;
    }
    const parser = createParser();
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      try {
        parser.parse(buffer, '', resolve, reject);
      } catch (parseError) {
        reject(parseError);
      }
    });
    if (options?.signal?.aborted) {
      disposeObject3DResources(gltf.scene, { disposeTextures: true });
      return null;
    }
    return gltf.scene;
  } catch (error: unknown) {
    if (options?.signal?.aborted) {
      return null;
    }
    console.warn(
      '101955 Bennu 3D mesh could not be loaded; using procedural faceted rocky fallback.',
      error,
    );
    return null;
  }
}
