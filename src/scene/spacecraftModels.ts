/**
 * Local spacecraft display assets.
 *
 * These files are render-only. They are never read by the simulation engine and
 * cannot change mass, state vectors, force terms, or any numerical result. The
 * GOES mesh is loaded only when the displayed record is the cached GOES-16
 * reference state or a circular approximation derived from it.
 */

import type { ScenarioInputs } from '../scenarios/scenarioInputs';

export const GOES16_REFERENCE_TARGET_ID = '-141866';

export type SpacecraftModelId = 'goes-16';

export type SpacecraftModelAsset = {
  id: SpacecraftModelId;
  label: string;
  localPath: string;
  sourcePageUrl: string;
  fileUrl: string;
  catalogUrl: string;
  usageUrl: string;
  format: string;
  bytes: number;
  sha256: string;
  retrievedAt: string;
  credit: string;
  creditDetail: string;
  renderNote: string;
};

/**
 * Official NASA GOES spacecraft GLB. The file was downloaded once from the
 * NASA Science asset URL on the source page, validated as glTF 2.0 binary, and
 * is served locally; the app makes no runtime request for it.
 */
export const GOES16_MODEL: SpacecraftModelAsset = {
  id: 'goes-16',
  label: 'GOES-R spacecraft mesh',
  localPath: '/assets/models/goes-r.glb',
  sourcePageUrl: 'https://science.nasa.gov/mission/goes-spacecraft-3d-model/',
  fileUrl:
    'https://assets.science.nasa.gov/content/dam/science/missions/goes/spacecraft/3dmodel/GOES-R.glb',
  catalogUrl: 'https://science.nasa.gov/3d-resources/',
  usageUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
  format: 'glTF 2.0 binary (.glb)',
  bytes: 6_439_892,
  sha256: 'C3549A276B7899253C60E82B0B24A3CFFB6A39E0DAD1A8C7F30A73E8DCEB6398',
  retrievedAt: '2026-10-21',
  credit: 'NASA GOES spacecraft 3D model',
  creditDetail:
    'Official NASA GOES Spacecraft 3D Model page. The page credits Lockheed Martin for labeled GOES-U spacecraft renderings; it does not publish a separate creator line or embedded copyright for the downloadable GLB. NASA 3D Resources states its assets are free and without copyright; NASA Images and Media Usage Guidelines apply.',
  renderNote:
    'Render-only mesh. It does not add mass, attitude, thrust, fuel, or dynamics to the massless test-particle model, and it does not change the simulated trajectory.',
};

/**
 * Returns the spacecraft mesh associated with a displayed record, if any.
 * A reference-derived circular approximation keeps the source provenance and
 * therefore keeps the same render-only mesh association.
 */
export function spacecraftModelForInputs(
  inputs: Pick<ScenarioInputs, 'reference' | 'derivedFrom'>,
): SpacecraftModelId | null {
  const source = inputs.reference ?? inputs.derivedFrom;
  if (!source) {
    return null;
  }
  return source.provenance.targetId === GOES16_REFERENCE_TARGET_ID ? 'goes-16' : null;
}

export function spacecraftModelAsset(
  model: SpacecraftModelId | null | undefined,
): SpacecraftModelAsset | null {
  return model === 'goes-16' ? GOES16_MODEL : null;
}
