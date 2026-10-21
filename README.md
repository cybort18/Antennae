# Antennae — Space Sandbox

Antennae is a browser-based educational space-physics sandbox. It opens on a schematic **Solar System
Overview** with the Sun and eight planets, then switches to an **Earth Orbit Lab** that simulates a
massless test particle orbiting Earth under simplified two-body point-mass gravity, draws the trajectory
the engine actually recorded in a 3D workspace, replays those samples as a timeline, and compares a
baseline run with a modified candidate run through a computed altitude-versus-time chart. The Lab also
loads one cached JPL Horizons reference state for GOES-16 with visible provenance and runs it as a
clearly labelled hypothetical two-body initial condition.

It is a learning and demonstration tool. It is **not** flight software, a navigation tool, or an
impact-prediction service. The Overview is a static reference visualization, not a planetary dynamics
model or an ephemeris.

## What works today

- **Solar System Overview** (`src/solarSystem/`, `src/scene/SolarSystemViewport.tsx`): the default landing
  mode. It shows the Sun and eight planets in a fixed, schematic layout with a body list, projected DOM
  labels, selectable bodies, camera focus and a whole-system reset. Four non-Earth textures (Mars, Jupiter,
  Venus, Neptune) are served locally from NASA 3D Resources; the Sun, Mercury, Saturn, and Uranus use
  procedural display materials, and Saturn's rings are procedural geometry. The screen states that sizes,
  distances, and positions are compressed and illustrative, and it computes no planetary dynamics. Switching
  to the Earth Orbit Lab and back is reversible; it does not clear the Lab's baseline or candidate records.
- **Deterministic two-body physics core** (`src/simulation/`), framework-independent TypeScript: point-mass
  gravity, fixed-step kick-drift-kick leapfrog integration, input validation, stop conditions, warnings, and
  byte-identical output for identical input.
- **3D workspace** (`src/app/`, `src/scene/`): a dominant full-bleed viewport with a locally hosted
  NASA Blue Marble Earth surface and static cloud layer, a deterministic procedural star field, the
  recorded trajectory, and the particle at the selected sample; object browser; inspector for supported
  initial conditions; results panel; model-and-limitations notice; and a clearly labelled **NOT TO
  SCALE** display. The scene falls back to the original procedural Earth if a texture cannot load.
- **Sample-quantized playback**: run, pause, reset, single-sample stepping, scrubbing, and 10x–1000x time
  scales move a cursor through recorded samples only. Nothing interpolated is presented as simulation output.
- **Baseline vs candidate comparison** (`src/comparison/`): each run is an immutable record of parameters,
  configuration, and engine result. Editing changes candidate *parameters* without integrating anything; the
  engine runs for the initial Lab baseline, an explicit **Run candidate**, or **Restore baseline parameters**.
  The initial baseline is created only on first entry to the Lab, so the default Overview does not execute the
  engine. You can replace the baseline with a confirmed two-step action and read an
  altitude-versus-simulated-time chart plus differences at the latest simulated time recorded by **both** runs.
- **Cached NASA/JPL reference preset** (`src/data/`): one provider-shaped JPL Horizons VECTORS response for
  GOES-16, validated for Earth body center, ICRF frame, TDB epoch, geometric state, and km/s units. The panel
  displays the target, source, epoch, frame, center, units, retrieval time, query, and exact vector. Loading
  it places the exact cached state into the candidate draft; running it is an explicit, hypothetical
  two-body propagation. Editing altitude or speed visibly converts the candidate to a circular
  approximation while retaining the original provider vector and source provenance. No live network
  request is made at runtime.
- **Honest failure surfaces**: invalid parameters show the engine's own validation messages and change
  nothing; a stopped run keeps its status and warning and is never extended or animated as if it completed;
  values that cannot be derived are reported as unavailable.

## The model and its limits

A massless test particle orbits a fixed central body (Earth) under point-mass gravity,
`a = -mu * r / |r|^3`, integrated with a fixed-step kick-drift-kick leapfrog (velocity Verlet) — a symplectic,
second-order method whose bounded energy error suits long educational runs. Units are km, s, kg, km/s, and
km³/s². States live in an Earth-centred inertial frame that carries no epoch, because the implemented forces
do not depend on time.

What the model does **not** include: other bodies or third-body perturbations, drag, atmosphere, oblateness,
rotation, thrust or propellant, relativity, and ephemeris-accurate positions. Earth's gravitational parameter
and mean radius are documented constants in `src/simulation/constants.ts`; they are not re-verified against a
live source on every run. Stop conditions are a configured impact radius and a numerical stability check on
energy deviation; the numbers are only meaningful for the model above.

Trajectory display uses one uniform scale (1 scene unit = 1,000 km) that never feeds back into the
simulation, and the viewport states explicitly that marker sizes and line widths are exaggerated.
The Earth surface and cloud textures are static display assets, not current-weather imagery or a
physical atmosphere model; the cloud layer does not rotate or update. The camera has Orbit and Earth
framing controls, and the comparison chart is a collapsible analysis drawer over the scene.

The Solar System Overview is a **separate schematic reference view**. Its orbit guides indicate order
only; body sizes, orbit spacing, and fixed phase angles are display composition values in scene units.
They are not physical radii, distances, orbital elements, dates, or current positions, and they are never
passed into the Earth Orbit Lab or the physics engine. It has no simulated time, weather, telemetry, or
planetary motion. Focusing a body changes the camera only.

The starting preset is an explicit synthetic idealisation, **not** NASA/JPL observational data. A second,
opt-in preset is a cached JPL Horizons state vector for GOES-16. Its initial vector is source data, but the
trajectory the application computes from it is a hypothetical two-body propagation, not the satellite's real
ephemeris. The state's TDB epoch is provenance metadata only: the implemented model has no epoch or time-scale
handling, and the ICRF axes are used directly as the model's Earth-centered inertial axes without a frame
rotation. Editing a reference-derived state creates a circular approximation; the original cached vector
is retained with the record but is no longer propagated. The application does not fetch Horizons at runtime.

## Visual assets and credits

The application uses six locally served NASA display images: two Earth Observatory Blue Marble images for
the Earth Orbit Lab and the Overview Earth, and four NASA 3D Resources planetary maps for Mars, Jupiter,
Venus, and Neptune in the Overview. They are **display assets only**: their pixels, cloud patterns, and
apparent weather do not define mass, radius, rotation, atmosphere, orbit, or any simulation state. All
files are bundled with the app and served from its own origin; the app makes no third-party or provider
texture request at runtime.

| Use | File | Source | Credit and terms |
|---|---|---|---|
| Equirectangular Earth surface | `public/assets/earth/blue-marble-2048.jpg` (2048 × 1024, 266,599 bytes) | [`land_ocean_ice_2048.jpg`](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg), from [Blue Marble: Next Generation](https://earthobservatory.nasa.gov/features/BlueMarble) | Produced by Reto Stöckli, NASA Earth Observatory (NASA Goddard Space Flight Center). NASA content; use consistent with the [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). No NASA insignia or logo is used. |
| Static cloud display layer | `public/assets/earth/blue-marble-clouds-2048.jpg` (2048 × 1024, 829,367 bytes) | [`cloud_combined_2048.jpg`](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg), NASA Earth Observatory Blue Marble Clouds (legacy Visible Earth image 57747) | NASA Earth Observatory. NASA content; use consistent with the NASA Images and Media Usage Guidelines. No individual creator line was exposed on the current legacy page; the asset is credited to NASA Earth Observatory. The cloud layer is static and does not represent current weather. |
| Mars surface | `public/assets/planets/mars.jpg` (1440 × 720, 972,896 bytes) | [`Mars.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/mars/Mars.jpg), from [NASA 3D Resources: Mars](https://science.nasa.gov/3d-resources/mars/) | NASA / Jet Propulsion Laboratory & Caltech. From Viking images processed at the USGS; from the JPL/Caltech planetary-map database. NASA content; use consistent with the NASA Images and Media Usage Guidelines. |
| Jupiter surface | `public/assets/planets/jupiter.jpg` (720 × 360, 225,878 bytes) | [`Jupiter.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/jupiter/Jupiter.jpg), from [NASA 3D Resources: Jupiter](https://science.nasa.gov/3d-resources/jupiter/) | JPL & Caltech. From Voyager images; from the JPL/Caltech planetary-map database. NASA content; use consistent with the NASA Images and Media Usage Guidelines. |
| Venus surface | `public/assets/planets/venus.jpg` (1440 × 720, 1,166,974 bytes) | [`Venus.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/venus/Venus.jpg), from [NASA 3D Resources: Venus](https://science.nasa.gov/3d-resources/venus/) | NASA/JPL-Caltech, inferred from the JPL/Caltech planetary-map database; the source page lists no separate credit line. Stitched from Magellan radar imagery with gaps filled by the published global texture. This is a radar-derived surface map, **not** a natural-colour cloud view. NASA content; use consistent with the NASA Images and Media Usage Guidelines. |
| Neptune surface | `public/assets/planets/neptune.jpg` (720 × 360, 210,528 bytes) | [`Neptune.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/neptune/Neptune.jpg), from [NASA 3D Resources: Neptune](https://science.nasa.gov/3d-resources/neptune/) | Don Davis & JPL/Caltech. A fictional cloud-feature texture created for visualization; **not** an observational map. NASA content; use consistent with the NASA Images and Media Usage Guidelines. |

The two Earth files were verified on 2026-10-20; the four planetary files were verified on 2026-10-21, all
as JPEGs (`FF D8 FF E0`) with the stated dimensions. The six files total 3,672,242 bytes (about 3.50 MiB);
the four Phase 3.6 additions total 2,576,276 bytes (about 2.46 MiB) and do not count the pre-existing Earth
assets. If the Earth surface texture is unavailable, the scene keeps a procedural Earth fallback; if a
planet texture is unavailable or fails to load, that body falls back to its documented procedural colour.
The local asset review register records the full review trail, including rejected candidates; as with the
other internal planning notes, it is not part of this publication.

## Requirements

- Node.js 22 or newer
- npm 11 or newer

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install project-local dependencies |
| `npm run dev` | Start the Vite dev server |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | TypeScript project check (`tsc -b`) |
| `npm run lint` | oxlint static analysis |
| `npm run build` | Type-check and produce a production bundle in `dist/` |
| `npm run preview` | Serve the production build locally |

Current verification (2026-10-21): `npm test` reports 226 passing tests in 24 files and `npm run
typecheck`, `npm run lint`, and `npm run build` exit 0. Re-run the commands rather than trusting those
numbers; the automated tests cover the physics core, the scenario bridge, result summaries, the comparison
math, the cached reference parser/provenance, texture-load fallback handling, the Solar System body
registry and screen behavior, and the workspace interaction flows.

## Project structure

```text
src/
  simulation/   # Framework-independent physics core: units, constants, force model,
                # integrator, validation, runner, derived metrics, tests
  scenarios/    # Editable inputs -> validated engine configuration (no physics here)
  data/         # Cached JPL Horizons fixture, parser, provenance, reference preset
  comparison/   # Run records, candidate runs, altitude series, shared-sample differences
  results/      # Display metrics and formatting derived from recorded samples
  solarSystem/  # Display-only Solar System registry: bodies, schematic layout, camera poses
  app/          # Workspace panels, playback, comparison chart, Overview screen, layout styles
  scene/        # 3D viewports (display only, one-way km -> scene-unit transform)
  components/   # Presentation-only UI primitives
  test/         # Shared test setup
public/assets/  # Locally served visual assets (NASA Earth and planetary textures)
docs/           # Technical documentation (see below)
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module boundaries, dependency direction, and the
  responsibilities of the simulation core, scenario bridge, comparison layer, and rendering layer.
- [`docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`](docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md) — the model
  contract, units and frame, integrator and timing behaviour, validation and stop conditions, measured
  numerical evidence, and the claims this project must not make.

Additional internal planning notes (decision log, roadmap and acceptance criteria, product brief, data and
asset planning) are intentionally not part of this publication.

## Not implemented yet

- Live NASA/JPL refresh and additional curated targets (the current milestone ships one cached Horizons
  reference preset with provenance).
- Mission designer: templates, target conditions, and pass/fail evaluation from computed values.
- An AI explanation layer; the simulation works without one and no results are generated by a model.
- 3D spacecraft models and a general asset-loading pipeline; the current build adds only the six local
  texture files described above and their procedural fallbacks.
- Persistence, accounts, sharing, and deployment configuration.
- Additional force models (N-body, thrust, drag) and any multi-body or spacecraft dynamics. The Solar
  System Overview is static; it does not model planetary motion or N-body gravity.

## Verification

The Solar System Overview and Earth Orbit Lab were exercised end-to-end in a real browser (production
build) as well as in the automated suite. The Overview was checked at 1600×1000, 1280×800, 900×800, and
390×844: all nine bodies rendered with WebGL 2, labels projected, body selection and camera focus/reset
worked, and the six local textures (five in the Overview, the cloud layer in the Lab) returned 200 across
the run. The details panel identified Earth as **NASA Earth Observatory** and the planet maps as **NASA 3D
Resources**, and the viewport credit named both sources. No horizontal overflow, console error, page error,
failed request, or external request was observed. The Lab flow loaded the cached GOES-16 state without
running it, ran the candidate explicitly, showed the two-series chart, advanced playback, and preserved the
candidate and records across repeated Overview/Lab switches at each viewport. Switching to the Overview pauses
playback instead of advancing it out of view; the cursor position is retained. Focus moves to the destination
heading/main region. The automated suite
also covers the default landing mode, body registry and texture provenance, fallback material state, the
cached reference parser/provenance, comparison records and math, and the existing workspace interactions.

## License

No `LICENSE` file is included in this publication, so no license is granted by default.
