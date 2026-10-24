# NASA/JPL Data Strategy

## 1. Purpose

Use documented NASA/JPL sources to seed realistic reference inputs where appropriate. Data retrieval must be separable from the physics engine, and the application must remain demonstrable if remote data is unavailable.

**Implementation status (2026-10-20): one cached reference preset is implemented.** `src/data/` contains a
provider-shaped JPL Horizons VECTORS fixture for GOES-16, a parser/validator, provenance metadata, and one
preset. There is **no live network request, refresh action, or runtime cache service**; the fixture is bundled
and parsed locally. The exact target, query, retrieval time, epoch, frame, center, units, and source are recorded
below and in the preset. The physics core still uses one locally recorded constant (Earth GM = 398600.4418
km^3/s^2, `src/simulation/constants.ts`) that has **not** been verified against a live source in this milestone.
Treat the Earth-constant provenance as a to-do before presenting it as sourced data.

## 2. Candidate sources

These are candidates recorded in the project blueprint. Verify current docs, schemas, access policies, units, rate limits, and attribution before integrating.

| Source | Candidate use | MVP priority | Cautions |
|---|---|---|---|
| [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Ephemerides/state vectors for supported targets and epochs | High | Record target, center, epoch, frame, time scale, units, and query options. |
| [JPL SSD API index](https://ssd-api.jpl.nasa.gov/) | Entry point to supported Solar System Dynamics APIs | High | Confirm endpoint and schema for the exact dataset. |
| [JPL Small-Body Database Lookup](https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html) | Asteroid/small-body metadata and available orbital/physical properties | High for asteroid support | Not every object has every physical parameter; unknowns remain unknown. |
| [CNEOS](https://cneos.jpl.nasa.gov/) | Near-Earth-object and close-approach context | Medium | A close-approach record alone is not an impact-risk computation. |
| [NASA/NSSDC Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) | Static planetary constants for presets/cross-checks | High | Cite the particular table/page and document converted units. |
| [NAIF/SPICE](https://naif.jpl.nasa.gov/naif/) | Kernels/toolkit for richer geometry/mission states | Low for MVP | Higher setup and domain complexity; defer unless the mission requires it. |

### 2a. Implemented cached preset (2026-10-20)

- **Provider:** NASA/JPL Horizons API (`https://ssd-api.jpl.nasa.gov/doc/horizons.html`, API signature version
  1.2 for the cached response).
- **Target:** GOES-16 (`-141866`), a NOAA geostationary weather satellite.
- **Output:** VECTORS, geometric Cartesian state, Earth body center (`CENTER='500@399'`), ICRF
  (`REF_PLANE='FRAME'`, `REF_SYSTEM='ICRF'`), km/s (`OUT_UNITS='KM-S'`), TDB time.
- **Epoch:** 2026-10-20 00:00:00.0000 TDB (JD 2461333.5), via `TLIST='2461333.5'` and `TLIST_TYPE='JD'`.
- **Retrieved:** 2026-10-20T08:11:49Z. The provider's generation header was
  `Tue Oct 20 01:10:43 2026 Pasadena, USA`.
- **Snapshot state (km, km/s):** position `(9603.113140073136, -41049.29701925249, -170.8594080548074)`;
  velocity `(2.994143623466347, 0.7001000064703707, -0.03991601822488292)`.
- **Cached fixture:** `src/data/fixtures/goes16Horizons.ts`; parser and validation in `src/data/horizons.ts`;
  provenance/preset construction in `src/data/referencePresets.ts`.
- **Runtime behavior:** no live request. Parsing rejects unsupported units, frames, centers, time scales,
  non-geometric output, malformed tables, non-finite values, and multiple rows. The exact state is used as the
  candidate's initial condition; editing altitude/speed converts it to a labelled circular approximation.
- **Attribution:** retain the NASA/JPL Horizons source and query with the cached values. NASA/JPL data is public
  reference material, but re-check current provider terms before any broader redistribution. The cached state is
  not a forecast or an operational ephemeris.
- **Known limitation:** ICRF is used directly as the model's Earth-centered inertial axes; the model has no
  epoch/time-scale or frame-rotation handling. The simulated trajectory is hypothetical.

### 2b. Solar System Overview static reference facts (2026-10-23, extended 2026-10-24)

`src/solarSystem/bodies.ts` includes static, educational physical reference facts (`SolarSystemPhysicalFacts`) for
the Sun, eight planets, and near-Earth asteroid **101955 Bennu**. These values are displayed in the Overview's
selected-body panel and provide the sidereal orbital periods used by the Overview's opt-in, period-proportional
schematic motion (`src/solarSystem/schematicMotion.ts`). They make **no runtime network requests** and never feed
the Earth-centered two-body simulation engine (`src/simulation/`).

- **Sources and field provenance:**
  1. **JPL Planetary Physical Parameters** (`https://ssd.jpl.nasa.gov/planets/phys_par.html`) — volumetric mean
     radius (`meanRadiusKm`) and sidereal orbital period in Julian years (`siderealOrbitPeriodYears`) for Mercury
     through Neptune:
     - Mercury: `2439.4 km`, `0.2408467 yr` (`87.969257175 d`)
     - Venus: `6051.8 km`, `0.61519726 yr` (`224.700799215 d`)
     - Earth: `6371.0084 km`, `1.0000174 yr` (`365.25635535 d`)
     - Mars: `3389.5 km`, `1.8808476 yr` (`686.9795859 d`)
     - Jupiter: `69,911 km`, `11.862615 yr` (`4332.82012875 d`)
     - Saturn: `58,232 km`, `29.447498 yr` (`10755.6986445 d`)
     - Uranus: `25,362 km`, `84.016846 yr` (`30687.1529915 d`)
     - Neptune: `24,622 km`, `164.79132 yr` (`60190.02963 d`)
  2. **JPL Approximate Positions of the Planets** (`https://ssd.jpl.nasa.gov/planets/approx_pos.html`) — Table 1
     J2000 mean-ecliptic Keplerian elements (`semiMajorAxisAu`, `eccentricity`, `inclinationDeg`), valid for
     1800 AD–2050 AD, used for Mercury, Venus, Mars, Jupiter, Saturn, Uranus, and Neptune.
  3. **NASA/NSSDC Planetary Fact Sheet — Earth** (`https://nssdc.gsfc.nasa.gov/planetary/factsheet/`) — used for
     Earth's J2000 mean orbital elements (`semiMajorAxisAu = 1.00000011 AU`, `eccentricity = 0.01671022`,
     `inclinationDeg = 0.00005°`) because JPL Approximate Positions Table 1 lists the Earth-Moon barycenter
     (`EM Bary`) rather than Earth alone. This distinction is recorded explicitly in Earth's `provenanceNote`.
  4. **NASA Sun Facts** (`https://science.nasa.gov/sun/facts/`) — approximate solar volumetric mean radius
     (`meanRadiusKm = 695,700 km`, cross-referenced with NASA/NSSDC). Heliocentric orbital quantities for the
     central Sun are explicitly `null` (displayed as `Not applicable (central star)`).
  5. **JPL Astrodynamic Parameters** (`https://ssd.jpl.nasa.gov/astro_par.html`) — exact Julian year definition
     (`1 Julian year = 365.25 Earth days`) used to compute `siderealOrbitPeriodDays = siderealOrbitPeriodYears * 365.25`.
  6. **JPL Small-Body Database (SBDB) API** (`https://ssd-api.jpl.nasa.gov/doc/sbdb.html`) and **JPL Small-Body
     Orbital Elements** (`https://ssd.jpl.nasa.gov/sb/orbits.html`) — queried at build/authoring time (`GET
     https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=101955&phys-par=1&full-prec=1`, retrieved 2026-10-24, signature
     version `1.3`) for asteroid **101955 Bennu (1999 RQ36)** (`SPK-ID 20101955`, Apollo near-Earth asteroid / PHA,
     Orbit Solution `118`, Epoch `JD 2455562.5` = `2011-Jan-01.0 TDB`, J2000 ecliptic):
     - `diameter = 0.48444 km` (±`0.00030 km`, Daly et al. 2020, *Sci. Adv.* 6, eabd3649); triaxial extent
       `0.5047 × 0.4918 × 0.4567 km`. Because SBDB publishes effective diameter rather than a direct radius field,
       `meanRadiusKm = 0.48444 / 2 = 0.24222 km` (`242.2 m`) is derived and labeled explicitly via
       `radiusDerivationNote`.
     - `rot_per = 4.296061 h` (±`0.000002 h`, Hergenrother et al. 2019, *Nat. Commun.* 10, 1291), stored in
       `rotationPeriodHours`.
     - `a = 1.126391025894812 AU`, `e = 0.2037450762416414`, `i = 6.03494377024794 deg`, `q = 0.8968944004459729 AU`
       (`perihelionAu`), `ad = 1.355887651343651 AU` (`aphelionAu`), and `per = 436.6487281120201 d`
       (`siderealOrbitPeriodDays`, with `siderealOrbitPeriodYears = 436.6487281120201 / 365.25 = 1.195479063961725 yr`).
     - In the Overview scene, Bennu is placed on a compressed circular schematic guide (`orbitRadius = 7.6` between
       Earth `6.9` and Mars `8.3`) and advances by `siderealOrbitPeriodDays` only; the UI explicitly discloses that
       the scene ring does not depict Bennu's real eccentricity (`e = 0.20375`), inclination (`i = 6.0349 deg`), or
       Earth-crossing geometry.

## 3. Internal data contract

Normalize provider payloads into an internal schema. Do not expose provider response shape throughout UI/components. The exact contract depends on the chosen model but typically records:

- target ID/name;
- state vector or needed physical parameters;
- epoch and relevant time scale;
- center/reference body;
- coordinate frame;
- units before and after conversion;
- source/provider;
- retrieval timestamp and request configuration;
- missing/unknown fields and validation warnings.

## 4. Safe integration pattern

1. Choose the smallest preset dataset needed by the first end-to-end scenario.
2. Inspect official docs and record the exact request/fields used.
3. Parse the response in a dedicated adapter.
4. Validate shape, units, epoch, frame, center, values, and required fields.
5. Convert through explicit unit/frame transformations.
6. Bundle a small, validated cached fixture when licensing/policy permits, with its provenance and retrieval details.
7. Add a fallback path for the demo; do not rely on a live remote call at the judging moment.
8. Offer live refresh as a separate operation if implemented.
9. When editing a source-derived object, preserve its reference state and mark the candidate scenario hypothetical.

## 5. Cache and outage rules

- Follow each provider's terms and caching/redistribution restrictions; do not assume a dataset can be bundled just because it is publicly accessible.
- Cached fixtures must be identifiable as cached data with source and retrieval date.
- If remote data fails, use only a matching documented fixture or display a clear error.
- Never silently swap in a different target, epoch, frame, or set of values.
- The simulation must remain usable with the curated data required for the main demo.

## 6. Browser and backend considerations

Do not assume every provider endpoint supports direct browser access; CORS, secret handling, request policies, and schema/version changes may require a server-side adapter. Any secret-bearing or AI request belongs behind a backend/serverless boundary when needed. Never commit real credentials. Keep the UI clear about whether data is live, cached, or user-defined.

## 7. Visual assets are a separate concern

3D model and texture assets belong strictly to the presentation layer and are documented in [`docs/ASSETS.md`](ASSETS.md). Visual assets do not supply physical parameters and make no runtime network requests. Physical states must always originate from documented data fixtures or user inputs.
