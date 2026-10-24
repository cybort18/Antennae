/**
 * Asteroid 101955 Bennu scene representation for the Solar System Overview.
 *
 * At the wide system view (`focusMode === 'overview'`) or when Bennu is not the
 * active selection, this component renders a lightweight procedural faceted
 * rocky shape and fetches zero bytes of GLB data. When Bennu is selected and
 * focused (`selected && focusMode === 'body'`), it lazily loads the official
 * lightweight NASA Science (VTAD) Bennu GLB, normalizing its display scale for
 * legibility and falling back to the procedural faceted shape if loading or
 * parsing fails. All GPU resources are disposed when unmounting or switching
 * bodies.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AdditiveBlending, type Object3D } from 'three';

import type {
  CameraFocusMode,
  SolarSystemBody,
  SolarSystemBodyId,
} from '../solarSystem/bodies';
import {
  BENNU_MODEL,
  bennuModelForOverviewState,
  disposeObject3DResources,
  loadBennuModelScene,
  normalizeBennuScene,
  type BennuMeshStatus,
} from './bennuModel';

function ProceduralBennuMesh({
  body,
  position,
  onSelect,
}: {
  body: SolarSystemBody;
  position: [number, number, number];
  onSelect: (id: SolarSystemBodyId) => void;
}) {
  return (
    <mesh
      name="overview-bennu-procedural"
      position={position}
      scale={[1.06, 0.88, 1.04]}
      rotation={[0.18, 0.64, -0.12]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(body.id);
      }}
    >
      <icosahedronGeometry args={[body.displayRadius, 1]} />
      <meshStandardMaterial
        color={body.fallbackColor}
        roughness={0.95}
        metalness={0.04}
        flatShading
        emissive="#14110e"
        emissiveIntensity={0.26}
      />
    </mesh>
  );
}

function LazyBennuGlbMesh({
  body,
  position,
  onSelect,
  onStatusChange,
}: {
  body: SolarSystemBody;
  position: [number, number, number];
  onSelect: (id: SolarSystemBodyId) => void;
  onStatusChange?: (status: BennuMeshStatus) => void;
}) {
  const [rawScene, setRawScene] = useState<Object3D | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    let loadedScene: Object3D | null = null;

    onStatusChangeRef.current?.('loading');

    void loadBennuModelScene(BENNU_MODEL.localPath, {
      signal: controller.signal,
    }).then((scene) => {
      if (!mounted || controller.signal.aborted) {
        disposeObject3DResources(scene, { disposeTextures: true });
        return;
      }
      if (!scene) {
        onStatusChangeRef.current?.('fallback');
        setRawScene(null);
        return;
      }
      loadedScene = scene;
      setRawScene(scene);
      onStatusChangeRef.current?.('ready');
    });

    return () => {
      mounted = false;
      controller.abort();
      if (loadedScene) {
        disposeObject3DResources(loadedScene, { disposeTextures: true });
        loadedScene = null;
      }
    };
  }, []);

  const normalizedModel = useMemo(
    () => (rawScene ? normalizeBennuScene(rawScene, body.displayRadius) : null),
    [body.displayRadius, rawScene],
  );

  useEffect(
    () => () => {
      if (normalizedModel) {
        disposeObject3DResources(normalizedModel, { disposeTextures: false });
      }
    },
    [normalizedModel],
  );

  if (!normalizedModel) {
    return (
      <ProceduralBennuMesh
        body={body}
        position={position}
        onSelect={onSelect}
      />
    );
  }

  return (
    <group
      name="overview-bennu-glb"
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(body.id);
      }}
    >
      <primitive object={normalizedModel} />
    </group>
  );
}

export type BennuAsteroidModelProps = {
  body: SolarSystemBody;
  position: [number, number, number];
  selected: boolean;
  focusMode: CameraFocusMode;
  onSelect: (id: SolarSystemBodyId) => void;
  onMeshStatusChange?: (status: BennuMeshStatus) => void;
};

export function BennuAsteroidModel({
  body,
  position,
  selected,
  focusMode,
  onSelect,
  onMeshStatusChange,
}: BennuAsteroidModelProps) {
  const shouldLoadOfficialMesh =
    bennuModelForOverviewState(selected ? body.id : 'sun', focusMode) !== null;

  useEffect(() => {
    if (!shouldLoadOfficialMesh) {
      onMeshStatusChange?.('procedural-overview');
    }
  }, [onMeshStatusChange, shouldLoadOfficialMesh]);

  return (
    <group name="overview-bennu">
      {shouldLoadOfficialMesh ? (
        <LazyBennuGlbMesh
          body={body}
          position={position}
          onSelect={onSelect}
          onStatusChange={onMeshStatusChange}
        />
      ) : (
        <ProceduralBennuMesh
          body={body}
          position={position}
          onSelect={onSelect}
        />
      )}

      {selected ? (
        <mesh position={position} scale={1.35} renderOrder={0}>
          <sphereGeometry args={[body.displayRadius, 24, 18]} />
          <meshBasicMaterial
            color="#b9f5ff"
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ) : null}
    </group>
  );
}
