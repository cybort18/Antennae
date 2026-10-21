/**
 * Solar System Overview reference data.
 *
 * This module is deliberately independent of `src/simulation/`: the overview is
 * a schematic reference visualization, not a planetary-physics engine. The
 * `orbitRadius`, `displayRadius`, and `phaseRadians` values below are display
 * composition values in scene units. They are not physical distances, radii,
 * orbital elements, or current positions, and must never be fed into the Earth
 * Orbit Lab or the two-body engine.
 *
 * Planetary textures are local display assets. Their source pages, credits,
 * dimensions, and byte sizes are kept with the registry so attribution and the
 * runtime asset paths cannot drift apart.
 */

export type SolarSystemBodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export type SolarSystemBodyKind = 'star' | 'terrestrial' | 'gas-giant' | 'ice-giant';

export type SolarSystemTexture = {
  localPath: string;
  sourcePageUrl: string;
  fileUrl: string;
  /** Public source family shown in the details panel and credit overlays. */
  sourceLabel: 'NASA Earth Observatory' | 'NASA 3D Resources';
  credit: string;
  creditDetail: string;
  format: 'JPEG';
  width: number;
  height: number;
  bytes: number;
  /**
   * Some official catalogue textures explicitly describe themselves as
   * fictional illustrative maps. They are still valid display assets, but the
   * UI must not present them as observational maps.
   */
  illustrative?: boolean;
  /** Short visible qualifier for radar-derived or illustrative surfaces. */
  surfaceNote?: string;
};

export type SolarSystemRing = {
  innerRadius: number;
  outerRadius: number;
  /** Optional radial gap between two ring bands, in body-radius multiples. */
  gap?: [number, number];
  color: string;
  opacity: number;
};

export type SolarSystemBody = {
  id: SolarSystemBodyId;
  name: string;
  kind: SolarSystemBodyKind;
  /** Position in the documented order from the Sun; the Sun is 0. */
  orderFromSun: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** Display-only distance from the Sun in scene units. Not a physical value. */
  orbitRadius: number;
  /** Display-only sphere radius in scene units. Not a physical value. */
  displayRadius: number;
  /** Display-only static composition angle in radians. Not an ephemeris. */
  phaseRadians: number;
  /** Visible dot/label colour, also used by the selector. */
  accentColor: string;
  /** Colour shown when the texture is absent or fails to load. */
  fallbackColor: string;
  texture?: SolarSystemTexture;
  ring?: SolarSystemRing;
  description: string;
};

export const SOLAR_SYSTEM_SCALE_NOTE =
  'Schematic reference view: body sizes, orbit spacing, and positions are compressed for legibility and are not to scale. Positions are illustrative, not an ephemeris.';

export const SOLAR_SYSTEM_ORBIT_NOTE =
  'Orbit guides indicate order only. They are not fitted orbits or computed trajectories.';

export const SOLAR_SYSTEM_MODE_NOTE =
  'Static reference visualization. No planetary dynamics are computed in this view.';

const EARTH_BLUE_MARBLE: SolarSystemTexture = {
  localPath: '/assets/earth/blue-marble-2048.jpg',
  sourcePageUrl: 'https://earthobservatory.nasa.gov/features/BlueMarble',
  fileUrl:
    'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg',
  sourceLabel: 'NASA Earth Observatory',
  credit: 'NASA Earth Observatory / Reto Stöckli',
  creditDetail:
    'Blue Marble: Next Generation base map, produced by Reto Stöckli (NASA Goddard Space Flight Center).',
  format: 'JPEG',
  width: 2048,
  height: 1024,
  bytes: 266599,
};

const MARS_TEXTURE: SolarSystemTexture = {
  localPath: '/assets/planets/mars.jpg',
  sourcePageUrl: 'https://science.nasa.gov/3d-resources/mars/',
  fileUrl:
    'https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/mars/Mars.jpg',
  sourceLabel: 'NASA 3D Resources',
  credit: 'NASA / Jet Propulsion Laboratory & Caltech',
  creditDetail:
    'From Viking images processed at the USGS; from the JPL/Caltech planetary-map database.',
  format: 'JPEG',
  width: 1440,
  height: 720,
  bytes: 972896,
};

const JUPITER_TEXTURE: SolarSystemTexture = {
  localPath: '/assets/planets/jupiter.jpg',
  sourcePageUrl: 'https://science.nasa.gov/3d-resources/jupiter/',
  fileUrl:
    'https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/jupiter/Jupiter.jpg',
  sourceLabel: 'NASA 3D Resources',
  credit: 'JPL & Caltech',
  creditDetail:
    'From Voyager images; from the JPL/Caltech planetary-map database.',
  format: 'JPEG',
  width: 720,
  height: 360,
  bytes: 225878,
};

const VENUS_TEXTURE: SolarSystemTexture = {
  localPath: '/assets/planets/venus.jpg',
  sourcePageUrl: 'https://science.nasa.gov/3d-resources/venus/',
  fileUrl:
    'https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/venus/Venus.jpg',
  sourceLabel: 'NASA 3D Resources',
  credit: 'NASA/JPL-Caltech',
  creditDetail:
    'Stitched from Magellan radar imagery with gaps filled by the published global texture; from the JPL/Caltech planetary-map database. The source page gives no separate credit line. This is a radar-derived surface map, not a natural-colour cloud view.',
  surfaceNote: 'radar-derived surface map, not natural colour',
  format: 'JPEG',
  width: 1440,
  height: 720,
  bytes: 1166974,
};

const NEPTUNE_TEXTURE: SolarSystemTexture = {
  localPath: '/assets/planets/neptune.jpg',
  sourcePageUrl: 'https://science.nasa.gov/3d-resources/neptune/',
  fileUrl:
    'https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/neptune/Neptune.jpg',
  sourceLabel: 'NASA 3D Resources',
  credit: 'Don Davis & JPL/Caltech',
  creditDetail:
    'Fictional cloud-feature texture created by Don Davis for visualization; not an observational map.',
  surfaceNote: 'not an observational map',
  format: 'JPEG',
  width: 720,
  height: 360,
  bytes: 210528,
  illustrative: true,
};

/** New Phase 3.6 non-Earth assets. Earth's existing Blue Marble is not counted here. */
export const NEW_PLANET_TEXTURES: readonly SolarSystemTexture[] = [
  MARS_TEXTURE,
  JUPITER_TEXTURE,
  VENUS_TEXTURE,
  NEPTUNE_TEXTURE,
];

export const NEW_PLANET_TEXTURE_BYTES = NEW_PLANET_TEXTURES.reduce(
  (total, texture) => total + texture.bytes,
  0,
);

export const SOLAR_SYSTEM_BODIES: readonly SolarSystemBody[] = [
  {
    id: 'sun',
    name: 'Sun',
    kind: 'star',
    orderFromSun: 0,
    orbitRadius: 0,
    displayRadius: 2.15,
    phaseRadians: 0,
    accentColor: '#ffd38a',
    fallbackColor: '#f6b94d',
    description: 'The star at the centre of the Solar System.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    kind: 'terrestrial',
    orderFromSun: 1,
    orbitRadius: 4.2,
    displayRadius: 0.31,
    phaseRadians: 0.58,
    accentColor: '#c2b19a',
    fallbackColor: '#8d8a82',
    description: 'The smallest planet and the closest to the Sun.',
  },
  {
    id: 'venus',
    name: 'Venus',
    kind: 'terrestrial',
    orderFromSun: 2,
    orbitRadius: 5.5,
    displayRadius: 0.42,
    phaseRadians: 2.2,
    accentColor: '#e7bb78',
    fallbackColor: '#c89454',
    texture: VENUS_TEXTURE,
    description: 'A terrestrial planet with a dense atmosphere.',
  },
  {
    id: 'earth',
    name: 'Earth',
    kind: 'terrestrial',
    orderFromSun: 3,
    orbitRadius: 6.9,
    displayRadius: 0.48,
    phaseRadians: 3.6,
    accentColor: '#6eb7df',
    fallbackColor: '#245c84',
    texture: EARTH_BLUE_MARBLE,
    description: 'Our home world and the body modelled by the Earth Orbit Lab.',
  },
  {
    id: 'mars',
    name: 'Mars',
    kind: 'terrestrial',
    orderFromSun: 4,
    orbitRadius: 8.3,
    displayRadius: 0.38,
    phaseRadians: 5.18,
    accentColor: '#d47b55',
    fallbackColor: '#a95336',
    texture: MARS_TEXTURE,
    description: 'A terrestrial planet with a thin atmosphere.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    kind: 'gas-giant',
    orderFromSun: 5,
    orbitRadius: 11.9,
    displayRadius: 1.12,
    phaseRadians: 0.92,
    accentColor: '#d8b291',
    fallbackColor: '#b58b68',
    texture: JUPITER_TEXTURE,
    description: 'The largest planet in the Solar System; a gas giant.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    kind: 'gas-giant',
    orderFromSun: 6,
    orbitRadius: 15.4,
    displayRadius: 0.96,
    phaseRadians: 4.38,
    accentColor: '#d9c394',
    fallbackColor: '#c4aa77',
    ring: {
      innerRadius: 1.18,
      outerRadius: 1.98,
      gap: [1.52, 1.68],
      color: '#d2bf93',
      opacity: 0.42,
    },
    description: 'A gas giant known for its extensive ring system.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    kind: 'ice-giant',
    orderFromSun: 7,
    orbitRadius: 18.5,
    displayRadius: 0.68,
    phaseRadians: 2.72,
    accentColor: '#9ed8df',
    fallbackColor: '#8fc7d1',
    description: 'An ice giant with a strongly tilted rotation axis.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    kind: 'ice-giant',
    orderFromSun: 8,
    orbitRadius: 21.2,
    displayRadius: 0.66,
    phaseRadians: 5.42,
    accentColor: '#6d95e7',
    fallbackColor: '#3e68b6',
    texture: NEPTUNE_TEXTURE,
    description: 'The outermost of the eight planets; an ice giant.',
  },
] as const;

export const SOLAR_SYSTEM_BODY_BY_ID: Readonly<
  Record<SolarSystemBodyId, SolarSystemBody>
> = Object.fromEntries(
  SOLAR_SYSTEM_BODIES.map((body) => [body.id, body]),
) as Record<SolarSystemBodyId, SolarSystemBody>;

export function bodyById(id: SolarSystemBodyId): SolarSystemBody {
  return SOLAR_SYSTEM_BODY_BY_ID[id];
}

export function kindLabel(kind: SolarSystemBodyKind): string {
  switch (kind) {
    case 'star':
      return 'Star';
    case 'terrestrial':
      return 'Terrestrial planet';
    case 'gas-giant':
      return 'Gas giant';
    case 'ice-giant':
      return 'Ice giant';
  }
}

/** Display position on the schematic orbital plane. Not a physical position. */
export function bodyPosition(id: SolarSystemBodyId): [number, number, number] {
  const body = bodyById(id);
  if (body.orbitRadius === 0) {
    return [0, 0, 0];
  }
  return [
    Math.cos(body.phaseRadians) * body.orbitRadius,
    0,
    Math.sin(body.phaseRadians) * body.orbitRadius,
  ];
}

export type CameraFocusMode = 'overview' | 'body';

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  near: number;
  far: number;
  maxDistance: number;
};

const OVERVIEW_CAMERA_POSITION: [number, number, number] = [0, 38, 46];
const OVERVIEW_TARGET: [number, number, number] = [0, 0, 0];

/**
 * Oblique top-down direction for a body-focused camera. Looking down at the
 * ecliptic keeps the Sun out of the foreground while the display lights still
 * illuminate the selected body. This is framing only, not a physical viewpoint.
 */
const FOCUS_DIRECTION: [number, number, number] = [0.37, 0.85, 0.37];

/**
 * Display-only camera pose for the overview or a selected body. The selected
 * body's target is its schematic display position; no engine state is read.
 */
export function cameraPose(
  focusMode: CameraFocusMode,
  selectedId: SolarSystemBodyId,
): CameraPose {
  if (focusMode === 'overview') {
    return {
      position: OVERVIEW_CAMERA_POSITION,
      target: OVERVIEW_TARGET,
      near: 0.05,
      far: 260,
      maxDistance: 100,
    };
  }

  const body = bodyById(selectedId);
  const target = bodyPosition(selectedId);
  const distance = 1.5 + body.displayRadius * 6.2;
  const length = Math.hypot(...FOCUS_DIRECTION);
  const direction: [number, number, number] = [
    FOCUS_DIRECTION[0] / length,
    FOCUS_DIRECTION[1] / length,
    FOCUS_DIRECTION[2] / length,
  ];

  return {
    position: [
      target[0] + direction[0] * distance,
      target[1] + direction[1] * distance,
      target[2] + direction[2] * distance,
    ],
    target,
    near: 0.05,
    far: 260,
    maxDistance: 100,
  };
}
