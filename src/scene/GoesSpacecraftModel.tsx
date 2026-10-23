/**
 * Local GOES spacecraft mesh, rendered only at the current recorded sample.
 *
 * The asset is fetched lazily by this component: the request starts only when a
 * GOES-16 reference-derived record is displayed. A load or parse failure is
 * caught here and falls back to the existing test-particle marker; it never
 * reaches the physics or comparison layers. Nothing in this file is imported by
 * the simulation.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  GLTFLoader,
  type GLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Object3D,
} from 'three';

import { GOES16_MODEL } from './spacecraftModels';
import { ParticleMarker } from './ParticleMarker';

function useGoesScene(
  onError?: () => void,
  onReady?: () => void,
): Object3D | null {
  const [scene, setScene] = useState<Object3D | null>(null);
  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onErrorRef.current = onError;
    onReadyRef.current = onReady;
  }, [onError, onReady]);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();

    fetch(GOES16_MODEL.localPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GOES mesh request failed with HTTP ${response.status}.`);
        }
        return response.arrayBuffer();
      })
      .then(
        (buffer) =>
          new Promise<GLTF>((resolve, reject) => {
            loader.parse(buffer, '', resolve, reject);
          }),
      )
      .then((gltf) => {
        if (!cancelled) {
          onReadyRef.current?.();
          setScene(gltf.scene);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.warn('GOES spacecraft mesh could not be loaded; using marker fallback.', error);
          onErrorRef.current?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return scene;
}

function NormalizedGoesMesh({
  source,
  radiusUnits,
}: {
  source: Object3D;
  radiusUnits: number;
}) {
  const model = useMemo(() => source.clone(true), [source]);

  useLayoutEffect(() => {
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    if (!(maxDimension > 0)) {
      return;
    }

    // The physical position is exact; only the mesh scale is a display choice.
    // Keep it large enough to read at orbit scale without changing any state.
    const scale = (radiusUnits * 32) / maxDimension;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    model.rotation.set(0, -0.55, 0.08);

    // The source materials are high-metalness PBR surfaces. With this scene's
    // simple lighting they render almost black; a small emissive lift keeps the
    // render-only mesh legible without adding a second lighting model or
    // affecting any physical value.
    model.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material instanceof MeshStandardMaterial) {
          material.emissive.set('#1b2a33');
          material.emissiveIntensity = 0.65;
          material.metalness = Math.min(material.metalness, 0.4);
          material.roughness = Math.max(material.roughness, 0.5);
          material.needsUpdate = true;
        }
      }
    });

    model.updateMatrixWorld(true);
  }, [model, radiusUnits]);

  return (
    <group name="goes-16-render-only">
      <primitive object={model} />
    </group>
  );
}

export type GoesSpacecraftModelProps = {
  position: [number, number, number];
  radiusUnits: number;
  onError?: () => void;
  onReady?: () => void;
};

export function GoesSpacecraftModel({
  position,
  radiusUnits,
  onError,
  onReady,
}: GoesSpacecraftModelProps) {
  const scene = useGoesScene(onError, onReady);
  const fallback = <ParticleMarker position={position} radiusUnits={radiusUnits} />;

  if (!scene) {
    return fallback;
  }

  return (
    <group position={position}>
      <NormalizedGoesMesh source={scene} radiusUnits={radiusUnits} />
    </group>
  );
}
