# Antennae — Space Sandbox

Antennae is a browser-based educational space-physics sandbox and mission trainer. It features four distinct active surfaces:
1. **Solar System Overview:** A schematic 3D Orrery visualization of the Sun, eight planets, and near-Earth asteroid **101955 Bennu** with period-proportional illustrative motion.
2. **Earth Orbit Lab:** An open orbital physics sandbox simulating a massless test particle orbiting Earth under deterministic two-body Newtonian gravity, with sample-quantized playback, baseline vs. candidate comparisons, an altitude-versus-time chart, and one cached JPL Horizons GOES-16 reference state.
3. **Mission Designer:** An objective-driven challenge (*Design a Stable Circular Earth Orbit*) evaluated strictly from recorded physics simulation samples.
4. **Outpost Mission Trainer:** A dedicated survival and resource-management simulation answering the NASA Space Apps Challenge *Build a Junior Astronaut Mission Trainer*, featuring 14-Sol planetary missions on Mars and the Moon, dynamic energy bus balancing, interactive SVG multi-metric timeline charting, and physical causal diagnostics.

It is a learning and demonstration tool. It is **not** flight software, a navigation tool, or an
impact-prediction service. The Overview is a schematic reference visualization with opt-in,
period-proportional illustrative motion, not a planetary dynamics model or a dated ephemeris.

## What works today

- **Solar System Overview** (`src/solarSystem/`, `src/scene/SolarSystemViewport.tsx`, `src/scene/BennuAsteroidModel.tsx`):
  the default landing mode. It shows the Sun, eight planets, and Apollo near-Earth asteroid **101955 Bennu** in a
  compressed schematic layout with a body list, deterministic 10-body collision-resolved projected DOM labels,
  selectable bodies, sourced physical reference facts (volumetric or derived mean radius, semi-major axis,
  sidereal orbital period in Earth days and Julian years, eccentricity, inclination, and—for Bennu—synodic
  rotation period and perihelion/aphelion distances with official NASA/JPL source links), camera focus, a
  whole-system reset, and an opt-in **Illustrative Schematic Motion** control strip (Reset, Play/Pause, ±10
  Earth-day steps, 0–3,650 Earth-day scrubber, and 10 / 60 / 365 d/s rates). Four non-Earth textures (Mars,
  Jupiter, Venus, Neptune) are served locally from NASA 3D Resources; the Sun, Mercury, Saturn, and Uranus use
  procedural display materials, and Saturn's rings are procedural geometry. Bennu uses a lightweight procedural
  faceted rocky shape at the wide system view and lazily loads an official NASA Visualization Technology
  Applications and Development (VTAD) 3D GLB mesh only when Bennu is selected and focused, falling back to the
  procedural rocky shape if the mesh cannot load. The screen states that sizes, distances, and positions are
  compressed and illustrative—including separating Bennu's circular schematic display guide from its real
  eccentric, inclined Apollo orbit—and it computes no planetary or asteroid dynamics. Switching among the
  Overview, Earth Orbit Lab, and Mission Designer is reversible; it pauses schematic motion while preserving
  elapsed schematic days and does not clear the shared baseline, candidate, draft, or playback records.
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
  engine runs for the initial baseline, an explicit **Run candidate**, **Restore baseline parameters**, or
  **Run Mission**. The initial baseline is created only on first entry to the Lab or Mission Designer, so the
  default Overview does not execute the engine. You can replace the baseline with a confirmed two-step action
  and read an altitude-versus-simulated-time chart plus differences at the latest simulated time recorded by
  **both** runs.
- **Mission Designer** (`src/missions/`, `src/app/MissionDesignerPanel.tsx`): one template, **Design a Stable
  Circular Earth Orbit**. The target altitude (250–2,000 km) is separate from the editable initial altitude and
  tangential speed. The evaluator derives the target radius, circular speed, and period from the documented
  Earth constants, then reads only the engine's recorded samples. A completed run must cover at least one target
  period, keep every recorded altitude inside the target ±20 km window, and stay at least 200 km above the mean
  Earth radius with at least 8 usable recorded samples. The result is **PASS**, **FAIL**, or **NOT EVALUABLE**,
  with each criterion's observed values and reason. Missing, empty, non-finite, malformed, stopped, or too-short
  results are not scored. The panel reports
  target and ideal circular values, minimum/maximum/span altitude, evaluation duration, usable sample count, run
  status, and warnings. Mission runs extend the test window to at least two initial reference periods so the
  target period is covered; the trajectory still comes from the unchanged two-body engine.
- **Cached NASA/JPL reference preset** (`src/data/`): one provider-shaped JPL Horizons VECTORS response for
  GOES-16, validated for Earth body center, ICRF frame, TDB epoch, geometric state, and km/s units. The panel
  displays the target, source, epoch, frame, center, units, retrieval time, query, and exact vector. Loading
  it places the exact cached state into the candidate draft; running it is an explicit, hypothetical
  two-body propagation. Editing altitude or speed visibly converts the candidate to a circular
  approximation while retaining the original provider vector and source provenance. No live network
  request is made at runtime. When a GOES-16 reference or reference-derived record is displayed, the viewport
  lazily loads one official NASA GOES spacecraft GLB as a **render-only** marker; it adds no mass, attitude,
  thrust, or dynamics, and a failed load falls back to the particle marker.
- **Outpost Mission Trainer (Junior Astronaut Mission Trainer)** (`src/outpost/`, `src/app/outpost/`, `src/scene/`):
  Directly addresses the official NASA Space Apps Challenge *Build a Junior Astronaut Mission Trainer*. It provides an educational, deterministic surface habitat resource-management and survival simulation across 14 Sols for two distinct planetary environments:
  - **Mars Jezero Crater Outpost Alpha** (`18.38°N 77.58°E`): Simulates surface atmospheric dust opacity variations ($\tau \in [0.18, 2.85]$), dust accumulation on solar arrays ($I_{\text{eff}} = I_0 e^{-\tau}$), life support (ECLSS) power requirements, an SPE space-weather solar radiation flare event, and agricultural hydroponics lighting/CO2 scrubbers.
  - **Moon Artemis South Pole Endurance** (`89.9°S 0.0°E`, Shackleton Crater rim): Simulates deep cryogenic lunar night (220 K drop), zero solar irradiance for 14 Sols, primary reliance on a 40 kW MMRTG nuclear generator, active thermal heating management, and lunar regolith shielding.
  - **Live Power Flow Diagram** (`src/app/outpost/PowerFlowDiagram.tsx`): Real-time energy balance visualizer displaying generation sources (Solar + MMRTG), central distribution bus balance, battery charging/discharging states, and subsystem loads.
  - **14-Sol Multi-Metric Timeline SVG Chart** (`src/app/outpost/OutpostHistoryChart.tsx`): Interactive timeline tracking Battery %, Crop Health %, Cumulative Radiation mSv, and Cabin O2 %, complete with safety threshold indicators, legend toggles, and Sol-by-Sol cursor inspection.
  - **Causal Diagnostics Engine & Flight Director Analysis** (`src/outpost/outpostDiagnostics.ts`, `src/app/outpost/CausalDiagnosticsCard.tsx`): Rule-based causal reasoning explaining physical cause-and-effect behind system stresses (e.g. why hypoxia occurs when power drops, how dust storms reduce solar irradiance, how magnetic shielding mitigates SPE flares), offering tactical flight director advice derived strictly from physical equations.
  - **Tactical Mid-Mission Dilemmas**: Sol 7 emergency events (e.g. "The Storm Peak Emergency", "Cryogenic Lock") forcing cadets to make principled trade-offs between scientific sample preservation, crew safety, and battery reserves.
  - **Interactive Procedural Audio Feedback** (`src/audio/outpostAudio.ts`): Built-in Web Audio API synthesizers producing authentic telemetry pings, power brownout alerts, solar flare sirens, and mission success chimes, fully toggleable and accessible.
- **Honest failure surfaces**: invalid parameters show the engine's own validation messages and change
  nothing; a stopped run keeps its status and warning and is never extended or animated as if it completed;
  values that cannot be derived are reported as unavailable. Mission outcomes use the same rule: an
  unevaluable run is not converted into a pass or a fail.

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
only; body sizes, orbit spacing, and initial phase angles are display composition values in scene units.
They are not physical radii, distances, orbital elements, dates, or current positions, and they are never
passed into the Earth Orbit Lab, Mission Designer, or physics engine. Its opt-in schematic motion advances
the eight planets and asteroid 101955 Bennu along their compressed circular guides at angular rates inversely
proportional to their sidereal orbital periods (`theta_i(days) = phaseRadians_i + 2*pi * elapsedDays / siderealOrbitPeriodDays_i`);
for Bennu, the circular guide between Earth and Mars is a schematic display path only, while its real eccentric
Apollo orbit (`a = 1.1264 AU`, `e = 0.20375`, `i = 6.0349 deg`, `q = 0.89689 AU`, `Q = 1.35589 AU`) is disclosed
in the reference panel. It is not a computed ephemeris or heliocentric dynamics model, and it has no weather or
telemetry. Focusing a body changes the camera only and tracks that body's schematic display position.

The starting preset is an explicit synthetic idealisation, **not** NASA/JPL observational data. A second,
opt-in preset is a cached JPL Horizons state vector for GOES-16. Its initial vector is source data, but the
trajectory the application computes from it is a hypothetical two-body propagation, not the satellite's real
ephemeris. The state's TDB epoch is provenance metadata only: the implemented model has no epoch or time-scale
handling, and the ICRF axes are used directly as the model's Earth-centered inertial axes without a frame
rotation. Editing a reference-derived state creates a circular approximation; the original cached vector
is retained with the record but is no longer propagated. The application does not fetch Horizons at runtime.

The Mission Designer does not add a second force model. It evaluates the same massless test particle against
one explicit target condition. There is no thrust, fuel, mass, attitude, transfer burn, atmosphere, Earth
rotation, frame conversion, collision model, or operational flight-safety claim. “Stable” means only that the
recorded samples satisfy this template's altitude, coverage, and clearance criteria; it is not a statement
about a real spacecraft or a certified orbit.

## Visual assets and credits

The application uses six locally served NASA display images: two Earth Observatory Blue Marble images for
the Earth Orbit Lab and the Overview Earth, and four NASA 3D Resources planetary maps for Mars, Jupiter,
Venus, and Neptune in the Overview. It also ships two local NASA 3D GLB models: one GOES spacecraft GLB for the
GOES-16 reference view in the Earth Orbit Lab, and one asteroid 101955 Bennu GLB for focused inspection in the
Solar System Overview. They are **display assets only**: their pixels, geometry, materials, cloud patterns, and
apparent weather do not define mass, radius, rotation, atmosphere, orbit, or any simulation state. All
files are bundled with the app and served from its own origin; the app makes no third-party or provider
asset request at runtime.

| Use | File | Source | Credit and terms |
|---|---|---|---|
| Equirectangular Earth surface | `public/assets/earth/blue-marble-2048.jpg` (2048 × 1024, 266,599 bytes) | [`land_ocean_ice_2048.jpg`](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg), from [Blue Marble: Next Generation](https://earthobservatory.nasa.gov/features/BlueMarble) | Produced by Reto Stöckli, NASA Earth Observatory (NASA Goddard Space Flight Center). NASA content; use consistent with the [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). No NASA insignia or logo is used. |
| Static cloud display layer | `public/assets/earth/blue-marble-clouds-2048.jpg` (2048 × 1024, 829,367 bytes) | [`cloud_combined_2048.jpg`](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg), NASA Earth Observatory Blue Marble Clouds (legacy Visible Earth image 57747) | NASA Earth Observatory. NASA content; use consistent with the NASA Images and Media Usage Guidelines. No individual creator line was exposed on the current legacy page; the asset is credited to NASA Earth Observatory. The cloud layer is static and does not represent current weather. |
| Mars surface | `public/assets/planets/mars.jpg` (1440 × 720, 972,896 bytes) | [`Mars.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/mars/Mars.jpg), from [NASA 3D Resources: Mars](https://science.nasa.gov/3d-resources/mars/) | NASA / Jet Propulsion Laboratory & Caltech. From Viking images processed at the USGS; from the JPL/Caltech planetary-map database. NASA content; use consistent with the NASA Images and Media Usage Guidelines. |
| Jupiter surface | `public/assets/planets/jupiter.jpg` (720 × 360, 225,878 bytes) | [`Jupiter.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/jupiter/Jupiter.jpg), from [NASA 3D Resources: Jupiter](https://science.nasa.gov/3d-resources/jupiter/) | JPL & Caltech. From Voyager images; from the JPL/Caltech planetary-map database. NASA content; use consistent with the NASA Images and Media Usage Guidelines. |
| Venus surface | `public/assets/planets/venus.jpg` (1440 × 720, 1,166,974 bytes) | [`Venus.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/venus/Venus.jpg), from [NASA 3D Resources: Venus](https://science.nasa.gov/3d-resources/venus/) | NASA/JPL-Caltech, inferred from the JPL/Caltech planetary-map database; the source page lists no separate credit line. Stitched from Magellan radar imagery with gaps filled by the published global texture. This is a radar-derived surface map, **not** a natural-colour cloud view. NASA content; use consistent with the NASA Images and Media Usage Guidelines. |
| Neptune surface | `public/assets/planets/neptune.jpg` (720 × 360, 210,528 bytes) | [`Neptune.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/neptune/Neptune.jpg), from [NASA 3D Resources: Neptune](https://science.nasa.gov/3d-resources/neptune/) | Don Davis & JPL/Caltech. A fictional cloud-feature texture created for visualization; **not** an observational map. NASA content; use consistent with the NASA Images and Media Usage Guidelines. |
| GOES spacecraft mesh (render only) | `public/assets/models/goes-r.glb` (glTF 2.0 binary, 6,439,892 bytes; SHA-256 `C3549A276B7899253C60E82B0B24A3CFFB6A39E0DAD1A8C7F30A73E8DCEB6398`) | [NASA GOES Spacecraft 3D Model](https://science.nasa.gov/mission/goes-spacecraft-3d-model/); file: [`GOES-R.glb`](https://assets.science.nasa.gov/content/dam/science/missions/goes/spacecraft/3dmodel/GOES-R.glb) | NASA GOES Program / NASA Science. The page credits Lockheed Martin for labeled GOES-U spacecraft renderings; it does not publish a separate creator line or embedded copyright for the downloadable GLB. NASA 3D Resources states its assets are free and without copyright. Use consistent with the [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). No NASA insignia or logo is used. **Render-only:** the mesh adds no mass, attitude, thrust, fuel, or dynamics and does not change the simulated trajectory. |
| Asteroid 101955 Bennu mesh (render only) | `public/assets/models/bennu.glb` (glTF 2.0 binary, 859,980 bytes; SHA-256 `B7740B53A77FF538082D26E7079510EF7810FC3DE9A5FF0FA316B393D2CF700E`) | [NASA Science — Bennu 3D Model](https://science.nasa.gov/resource/bennu-3d-model/); file: [`Bennu_1_1.glb`](https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/b/Bennu_1_1.glb) | NASA Visualization Technology Applications and Development (VTAD) / NASA Science. Self-contained glTF 2.0 binary (1 mesh, 1 material, 1 embedded PNG texture). NASA content; use consistent with the [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). No NASA insignia or logo is used. **Render-only:** loaded lazily only when Bennu is selected and focused in the Overview; adds no mass, physical radius, gravity, rotation physics, or dynamics. |

The two Earth files were verified on 2026-10-20; the four planetary files and the GOES GLB were verified on
2026-10-21; the Bennu GLB was verified on 2026-10-24. The six images total 3,672,242 bytes (about 3.50 MiB);
the GOES GLB adds 6,439,892 bytes (about 6.14 MiB) and the Bennu GLB adds 859,980 bytes (about 839.82 KiB,
0.82 MiB), for 10,972,114 bytes (about 10.46 MiB) of local visual assets across eight files. If the Earth
surface texture is unavailable, the scene keeps a procedural Earth fallback; if a planet texture is unavailable
or fails to load, that body falls back to its documented procedural colour. If the GOES mesh is unavailable,
the viewport keeps the particle marker and states that the mesh was unavailable. If the Bennu mesh is
unavailable or Bennu is viewed at the wide system view, the Overview renders a procedural faceted rocky
shape and states the active mesh/fallback status. The local asset review register records the full review
trail, including rejected candidates; as with the other internal planning notes, it is not part of this
publication.

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

Current verification (2026-10-25): `npm test` reports 343 passing tests in 41 files and `npm run
typecheck`, `npm run lint`, and `npm run build` exit 0. Re-run the commands rather than trusting those
numbers; the automated tests cover the physics core, the scenario bridge, result summaries, the comparison
math, the cached reference parser/provenance, texture-load fallback handling, the Solar System body
registry (including 101955 Bennu) and screen behavior, the deterministic 10-body projected-label collision
resolver, the circular-orbit mission evaluator, the mission interaction flow, the GOES and Bennu GLB
header/checksum/provenance/fallback contracts, and the existing workspace interaction flows.

## Project structure

```text
src/
  simulation/   # Framework-independent physics core: units, constants, force model,
                # integrator, validation, runner, derived metrics, tests
  scenarios/    # Editable inputs -> validated engine configuration (no physics here)
  missions/     # Framework-independent circular-orbit evaluator and thresholds
  data/         # Cached JPL Horizons fixture, parser, provenance, reference preset
  comparison/   # Run records, candidate runs, altitude series, shared-sample differences
  results/      # Display metrics and formatting derived from recorded samples
  solarSystem/  # Display-only Solar System registry: bodies (Sun, 8 planets, Bennu), schematic layout, camera poses
  app/          # Workspace panels, playback, comparison chart, mission UI, Overview screen
  scene/        # 3D viewports (display only, one-way km -> scene-unit transform), GOES & Bennu meshes
  components/   # Presentation-only UI primitives
  test/         # Shared test setup
public/assets/  # Locally served visual assets (NASA Earth/planetary textures, GOES & Bennu GLBs)
docs/           # Technical documentation (see below)
```

## Documentation

- [`AGENTS.md`](AGENTS.md) — shared cross-agent operational rules and engineering guidelines.
- [`PRD.md`](PRD.md) — product thesis, user personas, journeys, roadmap, and acceptance criteria.
- [`DESIGN.md`](DESIGN.md) — V3 minimalist canvas-first workspace principles, layout hierarchy, and visual rules.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module boundaries, dependency direction, and the responsibilities of simulation, bridge, and rendering layers.
- [`docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`](docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md) — the model contract, units and frame, integrator and timing behaviour, validation, stop conditions, and numerical evidence.
- [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) — NASA/JPL data provenance, cached GOES-16 Horizons contract, and parser validation rules.
- [`docs/ASSETS.md`](docs/ASSETS.md) — 3D asset pipeline, item-level attribution register, and render-only fallback behavior.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — append-only architectural and product decision history.

## Not implemented yet

- Live NASA/JPL refresh and additional curated targets (the current build ships one cached Horizons
  reference preset with provenance).
- Additional mission templates, mission history, and configurable acceptance thresholds. One circular-orbit
  template is implemented; the app does not score arbitrary mission designs.
- An AI explanation layer; the simulation works without one and no results are generated by a model.
- A general 3D asset-loading pipeline or a spacecraft/small-body model catalogue. The current build adds two
  verified, lazily loaded, render-only GLBs (GOES-R and 101955 Bennu) plus the six local textures described
  above and their fallbacks.
- Persistence, accounts, sharing, and deployment configuration.
- Additional force models (N-body, thrust, drag) and any multi-body or spacecraft dynamics. The Solar
  System Overview uses period-proportional schematic circular motion only; it does not model heliocentric
  planetary dynamics, N-body gravity, or a dated ephemeris.

## Verification

The Solar System Overview, Earth Orbit Lab, and Mission Designer were exercised end-to-end in a real browser
(production build) as well as in the automated suite. The Mission Designer was checked at 1600×1000,
1280×800, and 390×844: the objective, PASS/FAIL/NOT EVALUABLE outcome, target/initial controls, and **Run
Mission** action were visible; the default baseline passed; ±1% speed cases completed but failed the target
window; a stopped run and an invalid target were NOT EVALUABLE; the chart still compared the baseline and
candidate; and no horizontal overflow occurred. The baseline/candidate records survived repeated Mission →
Lab → Mission switches, and playback paused on mode changes. The Overview remained static and disclosed as
not a dynamics simulation.

The GOES-16 reference flow loaded the cached state without running it, ran it explicitly, and displayed the
local NASA mesh with the render-only badge, legend, and credit. A forced model-request block produced the
marker fallback and the same 17,230-record sample count and mission outcome as the loaded run, so the mesh
had no numerical effect. Normal flows produced no console error, page error, failed local request, or
external request. The blocked-model check necessarily produced the browser's failed-resource network message,
but no page error and the app remained usable. Focus moves to the destination heading/main region; the
Mission Designer focuses its objective heading. The automated suite also covers the default landing mode,
body registry and texture provenance, fallback material state, cached reference parser/provenance,
comparison records and math, the mission evaluator, the mission UI, the GOES asset contract, and the existing
workspace interactions.

## License

No `LICENSE` file is included in this publication, so no license is granted by default.
