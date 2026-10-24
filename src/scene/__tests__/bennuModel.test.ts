/// <reference types="node" />
/**
 * Local 101955 Bennu asset integrity, lazy-loading association, fallback,
 * resource disposal, and physics-isolation tests.
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Texture,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';

import { initialComparisonState } from '../../comparison/records';
import { evaluateCircularOrbitMission } from '../../missions';
import {
  BENNU_MODEL,
  SOLAR_SYSTEM_BODIES,
  type SolarSystemBodyId,
} from '../../solarSystem/bodies';
import {
  bennuModelForOverviewState,
  disposeObject3DResources,
  loadBennuModelScene,
  normalizeBennuScene,
} from '../bennuModel';
import { GOES16_MODEL } from '../spacecraftModels';

const bennuModelPath = resolve(process.cwd(), 'public/assets/models/bennu.glb');
const FIVE_MIB_BYTES = 5 * 1024 * 1024;

describe('101955 Bennu render-only mesh asset and loader', () => {
  it('matches the verified byte size (< 5 MiB), glTF 2.0 binary header, SHA-256, and self-contained structure', () => {
    const fileSize = statSync(bennuModelPath).size;
    expect(fileSize).toBe(BENNU_MODEL.bytes);
    expect(fileSize).toBeLessThan(FIVE_MIB_BYTES);

    const bytes = readFileSync(bennuModelPath);
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('glTF');
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(BENNU_MODEL.bytes);
    expect(createHash('sha256').update(bytes).digest('hex').toUpperCase()).toBe(
      BENNU_MODEL.sha256,
    );

    // Inspect embedded JSON chunk to confirm zero external .bin or texture URIs
    const jsonChunkLength = bytes.readUInt32LE(12);
    const jsonChunkType = bytes.subarray(16, 20).toString('ascii');
    expect(jsonChunkType).toBe('JSON');
    const gltfJson = JSON.parse(
      bytes.subarray(20, 20 + jsonChunkLength).toString('utf8'),
    ) as {
      buffers?: Array<{ byteLength: number; uri?: string }>;
      images?: Array<{ bufferView?: number; uri?: string }>;
      meshes?: unknown[];
    };

    expect(gltfJson.meshes?.length).toBeGreaterThan(0);
    for (const buffer of gltfJson.buffers ?? []) {
      expect(buffer.uri).toBeUndefined();
    }
    for (const image of gltfJson.images ?? []) {
      expect(image.uri).toBeUndefined();
      expect(typeof image.bufferView).toBe('number');
    }
  });

  it('records official NASA Science (VTAD) provenance and stays distinct from the GOES-16 model', () => {
    expect(BENNU_MODEL.id).toBe('bennu');
    expect(BENNU_MODEL.localPath).toBe('/assets/models/bennu.glb');
    expect(BENNU_MODEL.sourcePageUrl).toBe(
      'https://science.nasa.gov/resource/bennu-3d-model/',
    );
    expect(BENNU_MODEL.fileUrl).toBe(
      'https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/b/Bennu_1_1.glb',
    );
    expect(BENNU_MODEL.credit).toContain(
      'NASA Visualization Technology Applications and Development (VTAD)',
    );
    expect(BENNU_MODEL.renderNote).toMatch(/exaggerated for visual legibility/i);
    expect(BENNU_MODEL.renderNote).toMatch(/procedural faceted rocky shape/i);
    expect(BENNU_MODEL.localPath).not.toBe(GOES16_MODEL.localPath);
    expect(BENNU_MODEL.sha256).not.toBe(GOES16_MODEL.sha256);
  });

  it('associates the official mesh lazily only when Bennu is selected and focused in body mode', () => {
    expect(bennuModelForOverviewState('sun', 'overview')).toBeNull();
    expect(bennuModelForOverviewState('bennu', 'overview')).toBeNull();

    for (const body of SOLAR_SYSTEM_BODIES) {
      if (body.id === 'bennu') {
        expect(bennuModelForOverviewState(body.id, 'body')).toBe(BENNU_MODEL);
      } else {
        expect(bennuModelForOverviewState(body.id as SolarSystemBodyId, 'body')).toBeNull();
        expect(bennuModelForOverviewState(body.id as SolarSystemBodyId, 'overview')).toBeNull();
      }
    }
  });

  it('resolves null for procedural fallback when fetch fails, HTTP status is not OK, or glTF parsing fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const networkRejectResult = await loadBennuModelScene('/assets/models/bennu.glb', {
      fetchImpl: vi.fn().mockRejectedValue(new Error('network blocked')),
    });
    expect(networkRejectResult).toBeNull();

    const http404Result = await loadBennuModelScene('/assets/models/bennu.glb', {
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Response),
    });
    expect(http404Result).toBeNull();

    const parseErrorResult = await loadBennuModelScene('/assets/models/bennu.glb', {
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(16),
      } as unknown as Response),
      createParser: () => ({
        parse: (_data, _path, _onLoad, onError) => {
          onError?.(new Error('corrupt glb'));
        },
      }),
    });
    expect(parseErrorResult).toBeNull();

    warnSpy.mockRestore();
  });

  it('normalizes a loaded scene and disposes geometry, material, and texture resources cleanly on teardown', async () => {
    const sourceGroup = new Group();
    const geometry = new BoxGeometry(500, 460, 490);
    const texture = new Texture();
    const material = new MeshStandardMaterial({ map: texture, metalness: 0.5, roughness: 0.9 });
    const mesh = new Mesh(geometry, material);
    sourceGroup.add(mesh);

    const loaded = await loadBennuModelScene('/assets/models/bennu.glb', {
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(32),
      } as unknown as Response),
      createParser: () => ({
        parse: (_data, _path, onLoad) => {
          onLoad({ scene: sourceGroup } as unknown as GLTF);
        },
      }),
    });
    expect(loaded).toBe(sourceGroup);

    const normalized = normalizeBennuScene(sourceGroup, 0.22);
    expect(normalized).not.toBe(sourceGroup);
    expect(normalized.scale.x).toBeGreaterThan(0);
    expect(normalized.scale.x).toBeLessThan(0.01);

    const geomDisposeSpy = vi.spyOn(geometry, 'dispose');
    const matDisposeSpy = vi.spyOn(material, 'dispose');
    const texDisposeSpy = vi.spyOn(texture, 'dispose');

    disposeObject3DResources(normalized, { disposeTextures: false });
    expect(geomDisposeSpy).not.toHaveBeenCalled();

    disposeObject3DResources(sourceGroup, { disposeTextures: true });
    expect(geomDisposeSpy).toHaveBeenCalledTimes(1);
    expect(matDisposeSpy).toHaveBeenCalledTimes(1);
    expect(texDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps Solar System and Bennu modules isolated from the Earth Orbit Lab physics engine', () => {
    const filesToCheck = [
      'src/solarSystem/bodies.ts',
      'src/solarSystem/schematicMotion.ts',
      'src/scene/bennuModel.ts',
      'src/scene/BennuAsteroidModel.tsx',
      'src/scene/SolarSystemViewport.tsx',
      'src/app/SolarSystemOverview.tsx',
    ];

    for (const relPath of filesToCheck) {
      const sourceText = readFileSync(resolve(process.cwd(), relPath), 'utf8');
      expect(sourceText).not.toMatch(/from ['"][^'"]*simulation/);
    }

    const stateA = initialComparisonState();
    if (!stateA) {
      throw new Error('expected baseline simulation state');
    }
    const evalA = evaluateCircularOrbitMission({
      targetAltitudeKm: 400,
      result: stateA.baseline.result,
    });
    expect(evalA.status).toBe('pass');
    expect(stateA.baseline.result.samples.length).toBeGreaterThan(0);
  });
});
