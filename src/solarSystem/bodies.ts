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
  | 'neptune'
  | 'bennu';

export type SolarSystemBodyKind =
  | 'star'
  | 'terrestrial'
  | 'gas-giant'
  | 'ice-giant'
  | 'small-body';

export type SolarSystemModelAsset = {
  id: 'bennu';
  label: string;
  localPath: string;
  sourcePageUrl: string;
  fileUrl: string;
  catalogUrl: string;
  usageUrl: string;
  sourceLabel: 'NASA 3D Resources';
  credit: string;
  creditDetail: string;
  format: 'glTF 2.0 binary (.glb)';
  bytes: number;
  sha256: string;
  retrievedAt: string;
  renderNote: string;
};

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

export type SolarSystemReferenceSourceId =
  | 'jpl-phys-par'
  | 'jpl-approx-pos'
  | 'jpl-astro-par'
  | 'nasa-nssdc-fact-sheet'
  | 'nasa-sun-facts'
  | 'jpl-sbdb-api'
  | 'jpl-sb-orbits';

export type SolarSystemReferenceSource = {
  id: SolarSystemReferenceSourceId;
  label: string;
  url: string;
  scopeNote: string;
};

/**
 * Sourced physical reference facts for a Solar System body.
 *
 * These values are static educational reference facts only. They are never
 * converted into scene units, never replace the display-only `orbitRadius`,
 * `displayRadius`, or `phaseRadians` fields, and never feed the two-body
 * simulation engine. For the central Sun, heliocentric orbital quantities are
 * explicitly `null` (not applicable).
 */
export type SolarSystemPhysicalFacts = {
  /** Volumetric or effective mean radius in kilometres. */
  meanRadiusKm: number;
  /** Optional explicit note when mean radius is derived from effective diameter. */
  meanRadiusDerivedFrom?: string;
  /** Optional effective diameter in kilometres (supplied for small bodies by JPL SBDB). */
  effectiveDiameterKm?: number;
  /** Optional triaxial dimensions string from JPL SBDB. */
  triaxialDimensionsKm?: string;
  /** Optional synodic rotation period in hours from JPL SBDB. */
  rotationPeriodHours?: number;
  /** Heliocentric semi-major axis in astronomical units; null for the Sun. */
  semiMajorAxisAu: number | null;
  /** Optional perihelion distance in astronomical units from JPL SBDB. */
  perihelionAu?: number;
  /** Optional aphelion distance in astronomical units from JPL SBDB. */
  aphelionAu?: number;
  /** Sidereal orbital period in Julian years (365.25 days); null for the Sun. */
  siderealOrbitPeriodYears: number | null;
  /** Sidereal orbital period in Earth days (siderealOrbitPeriodYears * 365.25); null for the Sun. */
  siderealOrbitPeriodDays: number | null;
  /** Dimensionless orbital eccentricity; null for the Sun. */
  eccentricity: number | null;
  /** Orbital inclination to the J2000 ecliptic in degrees; null for the Sun. */
  inclinationDeg: number | null;
  /** Optional small-body orbit classification label (e.g., Apollo near-Earth asteroid). */
  orbitClassLabel?: string;
  /** Optional orbital solution and epoch context for osculating small-body elements. */
  orbitSolutionEpoch?: string;
  /** Provenance sources for the physical and orbital parameters above. */
  sources: readonly SolarSystemReferenceSource[];
  /** Optional field-level provenance or approximation note (e.g., Earth vs. EM Bary). */
  provenanceNote?: string;
};

export type SolarSystemBody = {
  id: SolarSystemBodyId;
  name: string;
  kind: SolarSystemBodyKind;
  /**
   * Position in the documented planet order from the Sun (1..8); the Sun is 0,
   * and small bodies are `null` so planet ordinals are never shifted.
   */
  orderFromSun: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;
  /** Display-only distance from the Sun in scene units. Not a physical value. */
  orbitRadius: number;
  /** Display-only sphere/mesh radius in scene units. Not a physical value. */
  displayRadius: number;
  /** Display-only static composition angle in radians. Not an ephemeris. */
  phaseRadians: number;
  /** Visible dot/label colour, also used by the selector. */
  accentColor: string;
  /** Colour shown when the texture or 3D mesh is absent or fails to load. */
  fallbackColor: string;
  texture?: SolarSystemTexture;
  model?: SolarSystemModelAsset;
  ring?: SolarSystemRing;
  /** Static physical reference facts with official NASA/JPL provenance. */
  facts: SolarSystemPhysicalFacts;
  description: string;
};

/** Exact Julian year length in days from JPL Astrodynamic Parameters. */
export const JULIAN_YEAR_DAYS = 365.25;

export const SOLAR_SYSTEM_REFERENCE_SOURCES: Readonly<
  Record<SolarSystemReferenceSourceId, SolarSystemReferenceSource>
> = {
  'jpl-phys-par': {
    id: 'jpl-phys-par',
    label: 'JPL Planetary Physical Parameters',
    url: 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
    scopeNote:
      'Volumetric mean radius (km) and sidereal orbital period (Julian years) for the eight planets.',
  },
  'jpl-approx-pos': {
    id: 'jpl-approx-pos',
    label: 'JPL Approximate Positions of the Planets',
    url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    scopeNote:
      'Table 1 J2000 mean-ecliptic Keplerian elements (a, e, I), valid 1800 AD–2050 AD (Table 1 lists the Earth-Moon barycenter rather than Earth alone).',
  },
  'jpl-astro-par': {
    id: 'jpl-astro-par',
    label: 'JPL Astrodynamic Parameters',
    url: 'https://ssd.jpl.nasa.gov/astro_par.html',
    scopeNote: 'Julian year definition (1 Julian year = 365.25 days) used for period conversion.',
  },
  'nasa-nssdc-fact-sheet': {
    id: 'nasa-nssdc-fact-sheet',
    label: 'NASA/NSSDC Planetary Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
    scopeNote:
      'Cross-checked planetary orbital facts and Earth J2000 mean orbital elements (used so Earth is not conflated with the Earth-Moon barycenter row in JPL Table 1).',
  },
  'nasa-sun-facts': {
    id: 'nasa-sun-facts',
    label: 'NASA Sun Facts',
    url: 'https://science.nasa.gov/sun/facts/',
    scopeNote: 'Approximate solar volumetric mean radius (~695,700 km; cross-referenced with NASA/NSSDC).',
  },
  'jpl-sbdb-api': {
    id: 'jpl-sbdb-api',
    label: 'JPL Small-Body Database (SBDB) API',
    url: 'https://ssd-api.jpl.nasa.gov/doc/sbdb.html',
    scopeNote:
      'Official JPL SBDB record for 101955 Bennu (SPK-ID 20101955, orbit solution 118, epoch JD 2455562.5 TDB; effective diameter 0.48444 km from Daly et al. 2020 and rotation period 4.296061 h from Hergenrother et al. 2019).',
  },
  'jpl-sb-orbits': {
    id: 'jpl-sb-orbits',
    label: 'JPL Small-Body Orbital Elements',
    url: 'https://ssd.jpl.nasa.gov/sb/orbits.html',
    scopeNote:
      'Heliocentric J2000 ecliptic osculating orbital element definitions and conventions for small bodies.',
  },
};

export const SOLAR_SYSTEM_SCALE_NOTE =
  'Schematic reference view: body sizes, orbit spacing, and positions are compressed for legibility and are not to scale. Positions are illustrative, not an ephemeris.';

export const SOLAR_SYSTEM_ORBIT_NOTE =
  'Orbit guides indicate order only. They are not fitted orbits or computed trajectories.';

export const SOLAR_SYSTEM_MODE_NOTE =
  'Reference visualization with opt-in period-proportional schematic motion. No planetary dynamics are computed in this view.';

export const SOLAR_SYSTEM_SCHEMATIC_MOTION_NOTE =
  'Illustrative schematic motion: angular speeds use sidereal orbital periods. Body sizes and orbit radii are compressed; positions do not represent a dated ephemeris.';

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

const PLANET_JPL_SOURCES: readonly SolarSystemReferenceSource[] = [
  SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-phys-par'],
  SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-approx-pos'],
  SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-astro-par'],
];

const EARTH_SOURCES: readonly SolarSystemReferenceSource[] = [
  SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-phys-par'],
  SOLAR_SYSTEM_REFERENCE_SOURCES['nasa-nssdc-fact-sheet'],
  SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-astro-par'],
];

const SUN_SOURCES: readonly SolarSystemReferenceSource[] = [
  SOLAR_SYSTEM_REFERENCE_SOURCES['nasa-sun-facts'],
  SOLAR_SYSTEM_REFERENCE_SOURCES['nasa-nssdc-fact-sheet'],
];

const BENNU_SOURCES: readonly SolarSystemReferenceSource[] = [
  SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-sbdb-api'],
  SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-sb-orbits'],
  SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-astro-par'],
];

/**
 * Official lightweight NASA Science 3D model for 101955 Bennu.
 * Downloaded from the NASA Science 3D resource page (NASA VTAD), verified as
 * self-contained glTF 2.0 binary (.glb), and loaded lazily only when Bennu is
 * selected and focused in the Overview.
 */
export const BENNU_MODEL: SolarSystemModelAsset = {
  id: 'bennu',
  label: '101955 Bennu 3D model',
  localPath: '/assets/models/bennu.glb',
  sourcePageUrl: 'https://science.nasa.gov/resource/bennu-3d-model/',
  fileUrl:
    'https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/b/Bennu_1_1.glb',
  catalogUrl: 'https://science.nasa.gov/3d-resources/',
  usageUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
  sourceLabel: 'NASA 3D Resources',
  credit: 'NASA Visualization Technology Applications and Development (VTAD)',
  creditDetail:
    'Official NASA Science 3D resource page for asteroid 101955 Bennu, credited to NASA Visualization Technology Applications and Development (VTAD). High-resolution scientific shape models from NASA SVS (https://svs.gsfc.nasa.gov/5069) are not bundled due to multi-hundred-megabyte size.',
  format: 'glTF 2.0 binary (.glb)',
  bytes: 859_980,
  sha256: 'B7740B53A77FF538082D26E7079510EF7810FC3DE9A5FF0FA316B393D2CF700E',
  retrievedAt: '2026-10-24',
  renderNote:
    'Render-only mesh loaded lazily when 101955 Bennu is selected and focused. Apparent size is exaggerated for visual legibility and does not represent physical or schematic scale. At the wide overview or if the mesh cannot load, a procedural faceted rocky shape is shown.',
};

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
    facts: {
      meanRadiusKm: 695_700,
      semiMajorAxisAu: null,
      siderealOrbitPeriodYears: null,
      siderealOrbitPeriodDays: null,
      eccentricity: null,
      inclinationDeg: null,
      sources: SUN_SOURCES,
      provenanceNote:
        'Central body of the heliocentric reference view; heliocentric orbital elements do not apply.',
    },
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
    facts: {
      meanRadiusKm: 2439.4,
      semiMajorAxisAu: 0.38709927,
      siderealOrbitPeriodYears: 0.2408467,
      siderealOrbitPeriodDays: 0.2408467 * JULIAN_YEAR_DAYS,
      eccentricity: 0.20563593,
      inclinationDeg: 7.00497902,
      sources: PLANET_JPL_SOURCES,
    },
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
    facts: {
      meanRadiusKm: 6051.8,
      semiMajorAxisAu: 0.72333566,
      siderealOrbitPeriodYears: 0.61519726,
      siderealOrbitPeriodDays: 0.61519726 * JULIAN_YEAR_DAYS,
      eccentricity: 0.00677672,
      inclinationDeg: 3.39467605,
      sources: PLANET_JPL_SOURCES,
    },
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
    facts: {
      meanRadiusKm: 6371.0084,
      semiMajorAxisAu: 1.00000011,
      siderealOrbitPeriodYears: 1.0000174,
      siderealOrbitPeriodDays: 1.0000174 * JULIAN_YEAR_DAYS,
      eccentricity: 0.01671022,
      inclinationDeg: 0.00005,
      sources: EARTH_SOURCES,
      provenanceNote:
        'Mean radius and sidereal period from JPL Planetary Physical Parameters; J2000 mean orbital elements (a, e, I) from NASA/NSSDC Earth Fact Sheet because JPL Approximate Positions Table 1 lists the Earth-Moon barycenter (EM Bary) rather than Earth alone.',
    },
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
    facts: {
      meanRadiusKm: 3389.5,
      semiMajorAxisAu: 1.52371034,
      siderealOrbitPeriodYears: 1.8808476,
      siderealOrbitPeriodDays: 1.8808476 * JULIAN_YEAR_DAYS,
      eccentricity: 0.0933941,
      inclinationDeg: 1.84969142,
      sources: PLANET_JPL_SOURCES,
    },
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
    facts: {
      meanRadiusKm: 69_911,
      semiMajorAxisAu: 5.202887,
      siderealOrbitPeriodYears: 11.862615,
      siderealOrbitPeriodDays: 11.862615 * JULIAN_YEAR_DAYS,
      eccentricity: 0.04838624,
      inclinationDeg: 1.30439695,
      sources: PLANET_JPL_SOURCES,
    },
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
    facts: {
      meanRadiusKm: 58_232,
      semiMajorAxisAu: 9.53667594,
      siderealOrbitPeriodYears: 29.447498,
      siderealOrbitPeriodDays: 29.447498 * JULIAN_YEAR_DAYS,
      eccentricity: 0.05386179,
      inclinationDeg: 2.48599187,
      sources: PLANET_JPL_SOURCES,
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
    facts: {
      meanRadiusKm: 25_362,
      semiMajorAxisAu: 19.18916464,
      siderealOrbitPeriodYears: 84.016846,
      siderealOrbitPeriodDays: 84.016846 * JULIAN_YEAR_DAYS,
      eccentricity: 0.04725744,
      inclinationDeg: 0.77263783,
      sources: PLANET_JPL_SOURCES,
    },
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
    facts: {
      meanRadiusKm: 24_622,
      semiMajorAxisAu: 30.06992276,
      siderealOrbitPeriodYears: 164.79132,
      siderealOrbitPeriodDays: 164.79132 * JULIAN_YEAR_DAYS,
      eccentricity: 0.00859048,
      inclinationDeg: 1.77004347,
      sources: PLANET_JPL_SOURCES,
    },
    description: 'The outermost of the eight planets; an ice giant.',
  },
  {
    id: 'bennu',
    name: '101955 Bennu',
    kind: 'small-body',
    orderFromSun: null,
    orbitRadius: 7.6,
    displayRadius: 0.22,
    phaseRadians: 1.48,
    accentColor: '#b7a99a',
    fallbackColor: '#7a7067',
    model: BENNU_MODEL,
    facts: {
      meanRadiusKm: 0.48444 / 2,
      meanRadiusDerivedFrom:
        'Derived as half of SBDB effective body diameter (0.48444 km / 2 = 0.24222 km; Daly et al. 2020)',
      effectiveDiameterKm: 0.48444,
      triaxialDimensionsKm: '0.5047 × 0.4918 × 0.4567 km',
      rotationPeriodHours: 4.296061,
      semiMajorAxisAu: 1.126391025894812,
      perihelionAu: 0.8968944004459729,
      aphelionAu: 1.355887651343651,
      siderealOrbitPeriodDays: 436.6487281120201,
      siderealOrbitPeriodYears: 436.6487281120201 / JULIAN_YEAR_DAYS,
      eccentricity: 0.2037450762416414,
      inclinationDeg: 6.03494377024794,
      orbitClassLabel: 'Apollo near-Earth asteroid (NEO · PHA)',
      orbitSolutionEpoch:
        'JPL SBDB solution 118 · Epoch JD 2455562.5 TDB (J2000 ecliptic)',
      sources: BENNU_SOURCES,
      provenanceNote:
        'JPL Small-Body Database (SBDB) record for 101955 Bennu (1999 RQ36), SPK-ID 20101955, orbit solution 118 (epoch JD 2455562.5 TDB, J2000 ecliptic). SBDB supplies effective body diameter 0.48444 km (±0.00030 km; Daly et al. 2020) rather than mean radius directly, so mean radius (0.24222 km) is derived as diameter / 2. Although Bennu follows an eccentric (e = 0.2037), inclined (i = 6.03°) Earth-crossing Apollo orbit (q = 0.8969 AU, Q = 1.3559 AU), the Overview renders a compressed circular schematic guide between Earth and Mars at Bennu’s sidereal angular rate; it does not render the true ellipse, inclination, or dated ephemeris.',
    },
    description:
      'A carbonaceous B-type Apollo near-Earth asteroid (1999 RQ36) and target of NASA’s OSIRIS-REx sample-return mission. Its semi-major axis (~1.126 AU) lies between Earth and Mars, though its eccentric orbit crosses Earth’s distance.',
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
    case 'small-body':
      return 'Near-Earth asteroid (small body)';
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

export function bodyPositionAtDays(
  id: SolarSystemBodyId,
  elapsedDays: number,
): [number, number, number] {
  const body = bodyById(id);
  const periodDays = body.facts.siderealOrbitPeriodDays;
  if (
    body.orbitRadius === 0 ||
    periodDays === null ||
    !Number.isFinite(elapsedDays) ||
    elapsedDays === 0
  ) {
    return bodyPosition(id);
  }
  const theta = body.phaseRadians + (2 * Math.PI * elapsedDays) / periodDays;
  return [
    Math.cos(theta) * body.orbitRadius,
    0,
    Math.sin(theta) * body.orbitRadius,
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
  elapsedDays = 0,
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
  const target = bodyPositionAtDays(selectedId, elapsedDays);
  const distance =
    body.kind === 'small-body'
      ? 0.95 + body.displayRadius * 4.5
      : 1.5 + body.displayRadius * 6.2;
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
