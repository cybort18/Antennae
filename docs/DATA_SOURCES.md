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
