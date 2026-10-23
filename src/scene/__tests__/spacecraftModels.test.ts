/// <reference types="node" />
/**
 * Local GOES asset integrity and association tests.
 *
 * The checksum and GLB header are part of the asset contract: the UI may only
 * claim to display the verified file that is committed under public/assets.
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadReferencePresets } from '../../data';
import {
  inputsFromReferencePreset,
  type ScenarioInputs,
} from '../../scenarios/scenarioInputs';
import {
  GOES16_MODEL,
  GOES16_REFERENCE_TARGET_ID,
  spacecraftModelAsset,
  spacecraftModelForInputs,
} from '../spacecraftModels';

const modelPath = resolve(process.cwd(), 'public/assets/models/goes-r.glb');

describe('GOES render-only mesh asset', () => {
  it('matches the recorded byte size, glTF binary header, and SHA-256', () => {
    expect(statSync(modelPath).size).toBe(GOES16_MODEL.bytes);
    const bytes = readFileSync(modelPath);
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('glTF');
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(GOES16_MODEL.bytes);
    expect(createHash('sha256').update(bytes).digest('hex').toUpperCase()).toBe(
      GOES16_MODEL.sha256,
    );
  });

  it('records the official NASA source and explicit render-only disclosure', () => {
    expect(GOES16_MODEL.sourcePageUrl).toBe(
      'https://science.nasa.gov/mission/goes-spacecraft-3d-model/',
    );
    expect(GOES16_MODEL.fileUrl).toMatch(/science\.nasa\.gov\/.*\/GOES-R\.glb$/);
    expect(GOES16_MODEL.creditDetail).toMatch(/Lockheed Martin/);
    expect(GOES16_MODEL.creditDetail).toMatch(/does not publish a separate creator line/);
    expect(GOES16_MODEL.renderNote).toMatch(/does not add mass/i);
    expect(GOES16_MODEL.format).toBe('glTF 2.0 binary (.glb)');
  });

  it('associates the mesh only with GOES-16 reference or derived records', () => {
    const preset = loadReferencePresets().presets[0];
    expect(preset?.provenance.targetId).toBe(GOES16_REFERENCE_TARGET_ID);
    if (!preset) {
      throw new Error('Expected the cached GOES-16 reference preset to load.');
    }

    const referenceInputs = inputsFromReferencePreset(preset, {
      orbitCount: 2,
      timestepSeconds: 10,
    });
    expect(spacecraftModelForInputs(referenceInputs)).toBe('goes-16');

    const derivedInputs: ScenarioInputs = {
      ...referenceInputs,
      reference: undefined,
      derivedFrom: preset,
      altitudeKm: 500,
      speedKmPerS: 7.6,
    };
    expect(spacecraftModelForInputs(derivedInputs)).toBe('goes-16');

    const syntheticInputs: ScenarioInputs = {
      altitudeKm: 400,
      speedKmPerS: 7.67,
      orbitCount: 2,
      timestepSeconds: 10,
    };
    expect(spacecraftModelForInputs(syntheticInputs)).toBeNull();
    expect(spacecraftModelAsset('goes-16')).toBe(GOES16_MODEL);
    expect(spacecraftModelAsset(null)).toBeNull();
  });
});
