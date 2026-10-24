# Decisions & Open Questions

This file prevents an AI agent from turning a suggestion into an unreviewed requirement. Update it when a product/architecture decision becomes firm.

## Agreed working context

| Topic | Current position | Status |
|---|---|---|
| Project identity | Antennae; product concept is Space Sandbox | Agreed working name |
| Product concept | Browser-based celestial physics sandbox plus mission design | Agreed concept |
| Product modes | Three surfaces: Solar System Overview (Explore/reference), Earth Orbit Lab (Open Physics Sandbox), Mission Designer | Agreed concept; implemented 2026-10-21 |
| AI role | Explain/compare computed results; do not be the numerical physics engine | Non-negotiable |
| Scientific starting data | NASA/JPL-inspired references with visible provenance, epoch/frame/units | One cached GOES-16/JPL Horizons preset implemented 2026-10-20; live refresh and additional datasets open |
| Coding workflow | OpenCode using DeepSeek V4.1 Flash-Free while available; Antigravity as IDE | User preference; local tooling may change |
| Documentation | Root `AGENTS.md` plus focused Markdown docs are the persistent source of project guidance; preserve the user-provided design PDF in the repository/workspace as the product blueprint | Agreed workflow direction |
| Artifact language | English for all repository content: docs, code comments, identifiers, test names, UI copy, and agent reports. The supplied design PDF is a read-only reference and remains unchanged. | Decided 2026-10-18 |
| Repository state | This directory is the project root. It contains `AGENTS.md`, `README.md`, `docs/`, `.agents/rules/`, the design PDF, and the application (`src/simulation` physics core, `src/missions` evaluator, the `src/data` cached-reference boundary, the `src/solarSystem` display-only Overview registry, and the `src/scene`, `src/app`, `src/scenarios`, `src/results`, `src/components` workspace UI). A local Git repository was initialized at the owner's explicit request; it now has commits on `main`, an `origin` remote pointing to the public GitHub repository, and tracked files; version control remains owner-managed. | Verified 2026-10-21 |
| Toolchain | npm with React + TypeScript + Vite, Vitest for tests, oxlint from the Vite template. The physics core is framework-independent. The 3D viewport uses Three.js with React Three Fiber and Drei (OrbitControls/gizmo/camera only). | Decided 2026-10-18; 3D stack added 2026-10-19 |
| First physics model | Two-body test particle orbiting a dominant Earth central body: km / s / kg units, Earth-centered inertial axes without an attached epoch, fixed-step kick-drift-kick leapfrog. | Implemented and tested 2026-10-18 |
| Asset creation | No team member currently owns custom 3D asset creation; use a curated, individually license-checked external asset set where useful | User-provided context; the Phase 3.6 six-texture set is selected and documented 2026-10-21 |
| Asset candidates | Six NASA texture files and two NASA 3D GLBs are implemented: two Earth Observatory Blue Marble images, four NASA 3D Resources planetary maps, the official GOES spacecraft model (render-only in Earth Orbit Lab), and the official NASA VTAD 101955 Bennu asteroid model (render-only when focused in Solar System Overview). Additional NASA 3D Resources, Solar System Scope, and Poly Haven items remain candidates for future assets | Current set implemented; future items require item-level review |
| Mission evaluation | One template, Design a Stable Circular Earth Orbit, evaluated from recorded engine samples with explicit PASS / FAIL / NOT EVALUABLE states. Target range 250–2,000 km, ±20 km tolerance, 200 km clearance, at least one target period, minimum 8 usable samples. Target is separate from initial conditions. | Implemented and tested 2026-10-21; additional templates and configurable thresholds open |

## Recommended defaults (verify against current repo)

| Topic | Recommended default | Revisit when |
|---|---|---|
| Challenge alignment | Space Mission Design Game (#13) if mission planning/evaluation is central | After comparing MVP against live official brief/judging criteria |
| First scenario | A well-defined educational Earth-orbit or Earth–Moon scenario | After validating supported physics and demo scope |
| Physics stage | A simple, validated two-body or suitable point-mass model before N-body | Only expand after benchmark tests pass |
| Frontend | React + TypeScript if no existing stack is selected | After inspecting repository scaffolding |
| 3D view | Three.js / React Three Fiber + Drei if the repo supports it | After baseline scene prototype/performance check |
| Data | A few curated reference presets plus cached fixture and provenance | First preset selected (JPL Horizons/GOES-16, cached); additional sources and live refresh still open |
| Persistence | Local scenario storage and JSON export first | Add server accounts/cloud persistence only if required |
| AI integration | Structured result payload and server-side secrets boundary | After physics/result pipeline works |
| UI language | English-only for repository artifacts and UI copy | Revisit only if the owner explicitly asks for Indonesian/bilingual presentation |

## Decision log

Entries are append-only: supersede an older decision with a newer dated entry instead of rewriting history.

### 2026-10-24 — Phase 5 Step 3: Asteroid 101955 Bennu in Solar System Overview

**Context.** After adding planetary reference facts, period-proportional schematic motion, and deterministic
projected-label collision resolution, the Solar System Overview still lacked a selectable small body and asteroid
3D surface representation. The owner requested adding Apollo near-Earth asteroid **101955 Bennu** to the Overview
as a selectable, sourced small body using the official JPL Small-Body Database (SBDB) API for reference facts and
the official lightweight NASA Science / VTAD Bennu 3D model (subject to a `< 5 MiB` asset gate), with a procedural
rocky fallback, lazy focus-only model loading, and explicit scientific disclosure separating Bennu's real eccentric
orbit from its circular schematic display ring.

**Choices made.**

1. **Sourced JPL SBDB physical and orbital reference facts.** `src/solarSystem/bodies.ts` adds `'bennu'` (`kind:
   'small-body'`, `orderFromSun: null`) after the eight planets so planetary ordering (`orderFromSun: 1..8`) is
   preserved unchanged. Reference values come from the official JPL Small-Body Database API
   (`https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=101955&phys-par=1&full-prec=1`, `SPK-ID 20101955`, Orbit Solution
   `118`, Epoch `JD 2455562.5` = `2011-Jan-01.0 TDB`, J2000 ecliptic) and JPL Small-Body Orbital Elements
   (`https://ssd.jpl.nasa.gov/sb/orbits.html`): `semiMajorAxisAu = 1.126391025894812 AU`,
   `eccentricity = 0.2037450762416414`, `inclinationDeg = 6.03494377024794 deg`, `perihelionAu = 0.8968944004459729 AU`,
   `aphelionAu = 1.355887651343651 AU`, `siderealOrbitPeriodDays = 436.6487281120201 d` (`1.195479063961725 Julian yr`),
   and `rotationPeriodHours = 4.296061 h`. Because SBDB publishes effective diameter (`diameter = 0.48444 km`,
   triaxial extent `0.5047 × 0.4918 × 0.4567 km`, Daly et al. 2020) rather than a direct radius field,
   `meanRadiusKm = 0.48444 / 2 = 0.24222 km` (`242.2 m`) is derived and labeled explicitly via
   `radiusDerivationNote`.
2. **Official lightweight NASA Science / VTAD GLB passes the `< 5 MiB` asset gate.** The downloadable asset from
   `https://science.nasa.gov/resource/bennu-3d-model/` (`Bennu_1_1.glb`) was inspected before bundling: it is a
   self-contained glTF 2.0 binary (`glTF` magic header, version `2`, `859,980` bytes / ~`839.82 KiB` / ~`0.82 MiB`,
   SHA-256 `B7740B53A77FF538082D26E7079510EF7810FC3DE9A5FF0FA316B393D2CF700E`) containing 1 mesh (1,419 vertices,
   8,076 indices), 1 material, 1 embedded PNG texture, and 0 external URI dependencies. It is stored locally at
   `public/assets/models/bennu.glb` and credited to NASA Visualization Technology Applications and Development
   (VTAD) / NASA Science.
3. **Focus-only lazy loading and procedural faceted rocky shape.** At the wide system view (`focusMode ===
   'overview'`) or when another body is selected, `BennuAsteroidModel` renders a lightweight procedural faceted
   rocky shape (`<icosahedronGeometry args={[0.22, 1]} />` with `flatShading`) and makes zero requests for
   `/assets/models/bennu.glb`. Only when `selectedId === 'bennu' && focusMode === 'body'` does `loadBennuModelScene`
   fetch and normalize `bennu.glb`. If the GLB fails to load or parse, the component keeps the procedural rocky
   fallback, reports `Bennu mesh unavailable · procedural rocky fallback` in both the viewport badge and the
   detail card, and throws no unhandled error. Cloned materials and source geometry/material/texture GPU resources
   are disposed on unmount.
4. **Explicit schematic vs. physical orbit disclosure.** Bennu sits on a compressed circular guide (`orbitRadius =
   7.6` scene units between Earth `6.9` and Mars `8.3`, `displayRadius = 0.22`, `phaseRadians = 1.48`) and advances
   with period-proportional schematic motion using its `436.6487 d` sidereal period. Both the detail card and
   provenance note state explicitly that the circular guide is for schematic legibility only and does not represent
   Bennu's real eccentric (`e = 0.20375`), inclined (`i = 6.0349 deg`), Earth-crossing Apollo orbit (`q = 0.89689 AU`,
   `Q = 1.35589 AU`).
5. **10-body deterministic label collision priority.** `src/scene/solarSystemLabels.ts` adds `'bennu'` at the end of
   `DEFAULT_LABEL_PRIORITY_ORDER` with fallback dimensions `{ width: 108, height: 20 }`. With `phaseRadians = 1.48`,
   all 10 labels are visible with zero overlaps at `elapsedDays = 0` on desktop viewports, and selecting Bennu
   promotes its label to highest priority alongside the Sun.

**Alternatives considered.** Bundling the NASA SVS 5069 laser-altimetry meshes (rejected: multi-hundred-MB offline
research meshes far exceed web constraints); loading `bennu.glb` at initial page load (rejected: unnecessary startup
payload when a tiny faceted icosahedron suffices at whole-system scale); rendering an elliptical inclined 3D ring
for Bennu inside the compressed schematic layout (rejected: mixing true eccentricity/inclination with compressed
non-linear planet radii would falsely imply geometric scale accuracy where Earth's schematic radius is `6.9` scene
units); shifting Mars–Neptune `orderFromSun` indices to `5..9` (rejected: Bennu is a near-Earth asteroid, not the
fourth planet, so `orderFromSun` is `null` and planets retain `1..8`).

**Consequences and follow-ups.** Total local visual assets increase by `859,980` bytes (~`0.82 MiB`) to
`10,972,114` bytes (~`10.46 MiB`) across eight files, with zero increase in initial startup network requests. The
Earth-centered two-body physics engine (`src/simulation/`), Earth Orbit Lab, and Mission Designer remain untouched.

**Tests added.** `src/scene/__tests__/bennuModel.test.ts` (GLB header/byte size/SHA-256/self-contained buffers,
focus-only association, normalization/centering, error fallback, GPU resource disposal, and simulation isolation)
plus expanded assertions in `src/solarSystem/__tests__/bodies.test.ts`,
`src/solarSystem/__tests__/schematicMotion.test.ts`, and `src/app/__tests__/overviewView.test.tsx`.

**Docs updated.** `README.md`, `PRD.md`, `docs/ASSETS.md`, `docs/DATA_SOURCES.md`, `docs/ARCHITECTURE.md`,
`docs/DECISIONS.md`.

### 2026-10-23 — Phase 5 Step 2: Solar System reference facts and illustrative schematic motion

**Context.** The Solar System Overview (`src/solarSystem/`, `src/app/SolarSystemOverview.tsx`,
`src/scene/SolarSystemViewport.tsx`) previously showed only qualitative labels and fixed static angles, with no
quantitative planetary reference facts or relative orbital motion. The owner requested sourced physical reference
facts for the Sun and eight planets plus an opt-in, period-proportional schematic motion control—while preserving
the compressed schematic layout, keeping all Phase 5 Step 1 UI precision changes intact, and strictly avoiding
ephemeris claims, heliocentric physics, runtime network calls, or new dependencies.

**Choices made.**

1. **Sourced physical reference facts stay separate from display geometry.** `src/solarSystem/bodies.ts` adds
   `SolarSystemPhysicalFacts` (`meanRadiusKm`, `semiMajorAxisAu`, `siderealOrbitPeriodYears`,
   `siderealOrbitPeriodDays`, `eccentricity`, `inclinationDeg`, `sources`, and optional `provenanceNote`) alongside
   `SOLAR_SYSTEM_REFERENCE_SOURCES`. Display-only fields (`orbitRadius`, `displayRadius`, `phaseRadians`) remain
   unchanged and are never replaced by physical AU or km values. For the central Sun, `meanRadiusKm` is `695,700 km`
   (`https://science.nasa.gov/sun/facts/`) and all heliocentric orbital fields are `null` (rendered as
   `Not applicable (central star)`).
2. **Exact source attribution and Earth vs. EM Bary distinction.** Mean radii and sidereal orbital periods in
   Julian years come from JPL Planetary Physical Parameters (`https://ssd.jpl.nasa.gov/planets/phys_par.html`) and
   are converted to Earth days via the exact Julian year (`365.25 d`, `https://ssd.jpl.nasa.gov/astro_par.html`).
   Approximate J2000 mean-ecliptic Keplerian elements (`a`, `e`, `I`, valid 1800–2050) come from JPL Approximate
   Positions Table 1 (`https://ssd.jpl.nasa.gov/planets/approx_pos.html`) for Mercury, Venus, Mars, Jupiter,
   Saturn, Uranus, and Neptune. Because JPL Table 1 lists the Earth-Moon barycenter (`EM Bary`) rather than Earth
   alone, Earth uses the NASA/NSSDC Earth J2000 mean orbital elements (`a = 1.00000011 AU`, `e = 0.01671022`,
   `I = 0.00005°`, `https://nssdc.gsfc.nasa.gov/planetary/factsheet/`) and states that distinction in its
   `provenanceNote`.
3. **Pure period-proportional circular schematic motion.** `src/solarSystem/schematicMotion.ts` computes
   `theta_i(days) = phaseRadians_i + 2 * PI * elapsedDays / siderealOrbitPeriodDays_i` on each planet's existing
   compressed `orbitRadius` in the `y = 0` plane, keeping the Sun at `[0, 0, 0]`. At `elapsedDays = 0`, every body
   returns to its exact static `bodyPosition(id)` coordinates; advancing by one full sidereal period returns each
   planet to its initial schematic position within `< 1e-9` scene units. Angular speeds are strictly inversely
   proportional to sidereal orbital periods.
4. **Opt-in motion strip and mode-switch lifecycle.** `SolarSystemOverview` adds a restrained bottom motion strip
   (Reset to `0 d`, Play/Pause, `−10 d` / `+10 d` steps, `0–3,650` Earth-day scrubber representing `10 Julian years`,
   `10 d/s`, `60 d/s`, and `365 d/s` playback rates, tabular-numeral readout, and persistent
   `ILLUSTRATIVE MOTION · NOT AN EPHEMERIS` disclosure). Motion always initializes paused (including under
   `prefers-reduced-motion: reduce`), stops automatically at `3,650 d`, and clamps animation frame deltas to
   `0.25 s`. `App.tsx` holds `overviewElapsedDays` and `overviewRateDaysPerSec` so switching Overview → Lab/Mission
   unmounts the Overview cleanly (pausing motion without keeping a hidden WebGL canvas mounted) and returning to
   Overview restores the exact elapsed-day counter in a paused state. When a body is focused, `CameraFocus` and
   `LabelProjector` track its moving schematic position. The physics engine (`src/simulation/`) is never called.

**Alternatives considered.** Using `semiMajorAxisAu` for scene orbit radii (rejected: inner planets would collapse
into the Sun at whole-system zoom); using JPL Table 1 `EM Bary` elements silently as Earth (rejected: violates data
honesty); keeping the Overview WebGL canvas mounted while in Lab/Mission (rejected: wastes GPU resources when lifting
two scalar state values in `App.tsx` suffices); adding a calendar date picker (rejected: would falsely imply a
dated ephemeris).

**Consequences and follow-ups.** The Overview now communicates both relative orbital periods and sourced planetary
scale/elements while remaining explicitly a schematic reference view. Bennu and small-body exploration remain
scoped for a subsequent step.

**Tests added.** `src/solarSystem/__tests__/schematicMotion.test.ts` and expanded assertions in
`src/solarSystem/__tests__/bodies.test.ts` and `src/app/__tests__/overviewView.test.tsx`.

**Docs updated.** `README.md`, `PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `docs/DECISIONS.md`.

### 2026-10-23 — Documentation system consolidation (Stage 2)

**Context.** The repository accumulated twelve Markdown guides and private planning documents in `docs/` alongside
root `AGENTS.md` and `README.md`. Massive duplication existed across phase narratives, engineering rules, and
asset tables. Furthermore, older documents fossilized outdated 3-column permanent desktop layouts that conflicted
with the newly implemented V3 minimalist canvas-first workspace. The owner directed a controlled documentation
consolidation into a clear, unified system without losing any scientific equations, numerical tolerances, NASA/JPL
provenance, asset credits, or historical decisions.

**Choices made.**

1. **Four primary root entry points.** Established `AGENTS.md` (shared, tool-agnostic operational rules), `PRD.md`
   (canonical product requirements, user journeys, roadmap, and MVP-01..10 criteria), `DESIGN.md` (V3 minimalist
   workspace standards, visual tokens, accessibility, and visual QA), and `README.md` (public overview and verified
   quickstart).
2. **Five focused technical domain references in `docs/`.** Retained and updated `docs/ARCHITECTURE.md` (layer
   contracts and module boundaries), `docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md` (mathematical formulas, leapfrog
   integrator contract, stop conditions, benchmark evidence), `docs/DATA_SOURCES.md` (JPL Horizons query and
   cached fixture contract), `docs/ASSETS.md` (consolidating asset pipeline rules and the complete 7-item
   attribution register with checksums), and `docs/DECISIONS.md` (append-only ADR log).
3. **Local private archive for superseded source documents.** Moved the eight superseded source files
   (`AI_AGENT_WORKFLOW.md`, `ASSET_ATTRIBUTION.md`, `ASSET_PIPELINE.md`, `PRODUCT_DESIGN.md`, `PROJECT_CONTEXT.md`,
   `REFERENCE_NOTES.md`, `ROADMAP_AND_ACCEPTANCE.md`, `UX_UI_GUIDELINES.md`) into `docs/.archive/`. Added
   `docs/.archive/` to `.gitignore` so historical records remain byte-for-byte preserved on the local disk without
   being exposed to accidental Git staging or publication.
4. **Public-safe `AGENTS.md` and tracking boundary.** Removed `AGENTS.md` from `.gitignore` so teammates cloning
   the repository receive shared cross-agent operational rules. The file was audited to ensure zero private
   machine paths or transient model promotions are present.
5. **No `GEMINI.md`.** Universal engineering principles remain in `AGENTS.md`, while IDE-specific triggers
   remain in `.agents/rules/` without duplicating common rules.

**Alternatives considered.** Leaving twelve separate files (rejected: high cognitive load and specification drift);
single monolithic document (rejected: mixes product scope, visual tokens, numerical invariants, and asset licensing);
creating model-specific documentation (rejected: leads to immediate drift and maintenance overhead).

**Consequences and follow-ups.** The documentation surface is reduced from 14 files to 4 primary entry points and
5 domain contracts. Zero scientific formulas, constants, benchmark tolerances, Horizons vectors, asset checksums,
or historical decisions were lost. All internal Markdown links resolve to active canonical files.

### 2026-10-21 — Phase 4 Mission Designer and render-only GOES mesh

**Context.** The comparison half of Phase 4 was complete, but there was no mission objective or pass/fail
evaluation. The owner asked for a deterministic, math-first Mission Designer using the existing two-body engine,
one template for a stable circular Earth orbit, clearer navigation between Explore/Sandbox/Mission surfaces, and
one genuine official NASA spacecraft GLB for the GOES-16 reference view. Constraints: no new dependency, no AI
or generated numbers, no thrust/fuel/transfer/N-body/rotation/frame conversion, no operational flight-safety
claims, preserve the existing records/chart/playback/visual language, and keep private planning docs out of the
tracked/public tree.

**Choices made.**

1. **The evaluator is a small framework-independent module.** `src/missions/circularOrbitMission.ts` imports
   the documented Earth constants and engine types/helpers, but no React, Three.js, browser API, or comparison
   state. The UI passes a target altitude and the current `SimulationResult`; the evaluator returns a structured
   status, reason, metrics, and one criterion object per rule.
2. **One explicit template and thresholds.** The template is **Design a Stable Circular Earth Orbit**. The target
   range is 250–2,000 km, the altitude tolerance is ±20 km, the minimum clearance is 200 km above the mean Earth
   radius, and the recorded samples must cover at least one target period with at least 8 usable samples. The
   target altitude is separate from the existing initial-altitude and tangential-speed controls. Target radius,
   circular speed, and period are derived from `R_Earth + altitude`, `sqrt(mu/r)`, and `2*PI*sqrt(r^3/mu)`.
3. **Evaluation reads recorded samples, never inputs or rendering.** PASS requires a completed run, sufficient
   recorded coverage, every recorded altitude inside the target window, and the clearance maintained. A completed
   run that violates a criterion is FAIL. Missing, empty, non-finite, malformed, stopped, truncated, or too-short
   results are NOT EVALUABLE, never a pass or fail. Altitude span is reported for context but is not a separate
   hidden criterion; the tolerance window already bounds a valid span.
4. **The mission test window is fixed by the task, not the design.** Run Mission extends the draft to at least two
   initial reference periods (and enough periods to cover the target period) before invoking the unchanged
   engine. The two-period floor covers the documented target range at the minimum supported initial altitude. The
   extension changes only the duration, not the force model or integrator. `Run Mission` remains one explicit
   action; editing does not run anything.
5. **Three surfaces share one record store.** The mode tabs now expose Solar System Overview, Earth Orbit Lab, and
   Mission Designer. The baseline/candidate records, draft, playback cursor, and reference preset are shared;
   switching modes pauses playback, moves focus to the destination heading/main region, and never resets or
   advances a hidden run. The Mission Designer uses the existing altitude chart, comparison summary, and sampled
   results behind a disclosure so the primary objective, outcome, controls, and Run Mission action stay first.
6. **Mission UI is task-first and progressive.** The panel presents the objective and pass rule, a compact
   PASS/FAIL/NOT EVALUABLE card with a plain-language reason, ordered target/initial controls, an ideal-circular
   start helper, one primary Run Mission button, the three criteria, and a compact metrics grid. Long provenance,
   method, warnings, and comparison details use native disclosures. The right-column panel is placed before the
   scene on stacked phone layouts so the task is not buried.
7. **One official NASA GOES-R GLB, render-only.** The official NASA Science GOES Spacecraft 3D Model page
   provides `GOES-R.glb` (6,439,892 bytes; glTF 2.0 binary; SHA-256
   `C3549A276B7899253C60E82B0B24A3CFFB6A39E0DAD1A8C7F30A73E8DCEB6398`; 28 nodes/meshes, 17 materials, four
   embedded textures, no animations). It is stored at `public/assets/models/goes-r.glb`, loaded only for a
   GOES-16 reference or reference-derived displayed record, and normalized for display. A load failure falls back
   to the particle marker and changes the overlay text. The mesh adds no mass, attitude, thrust, fuel, physical
   radius, or dynamics and is never read by the simulation, mission, result, or comparison layers. The source
   page credits Lockheed Martin for labeled GOES-U renderings but publishes no separate creator/copyright line
   for the GLB itself; that uncertainty is recorded, along with the NASA 3D Resources “free and without
   copyright” statement and the NASA Images and Media Usage Guidelines.
8. **No new dependency, no AI, and no second physics path.** The model uses the existing Three.js
   `GLTFLoader` inside the existing R3F scene, and the existing SVG chart. The mission evaluator and UI add no
   provider, API key, network request, score model, or generated numerical result. AI remains deferred.

**Alternatives considered.** A separate mission runner (rejected: it would create a second engine path and could
diverge from the Lab); evaluating input values or visual proximity (rejected: violates the recorded-sample rule);
treating stopped or short runs as failures (rejected: those runs are not evaluable and must not be scored);
adding a user-editable tolerance/clearance panel (deferred: one fixed template is clearer and testable); a charting
library (not needed); a manual run-duration control (rejected for the mission surface: the task requires coverage,
so the window is extended deterministically); an unofficial/free spacecraft model or downloaded planet JPGs
(rejected: provenance and scope); loading the GLB at startup or for synthetic runs (rejected: lazy, reference-only);
using a second lighting/rendering path for the mesh (rejected: an emissive/material lift is a display-only
adaptation).

**Consequences and follow-ups.** The mission result is only as meaningful as the two-body model and the chosen
thresholds; “stable” is a template label, not an operational certification. The evaluator has one template and
no persistence or mission history. The GLB adds about 6.14 MiB, so total local visual assets are about 9.64 MiB;
the prior 8 MiB texture target no longer describes the full asset set. The model's source page does not state a
separate creator/copyright line for the GLB, so that uncertainty remains visible. The Three.js bundle-size warning
is pre-existing. Future work can add mission templates, configurable thresholds, mission history/persistence, live
reference refresh, and an AI explanation layer once those are separately approved and validated.

**Tests added.** `src/missions/__tests__/circularOrbitMission.test.ts` (real-engine ideal pass, ±1% completed
off-target failures, completed clearance violation, invalid target, missing/empty/non-finite/malformed samples,
stopped run, insufficient duration, truncated coverage, determinism); `src/app/__tests__/missionView.test.tsx`
(mission UI, pass/fail/not-evaluable, focus, mode-switch record preservation, playback pause, GOES association);
`src/scene/__tests__/spacecraftModels.test.ts` (GLB header/byte size/SHA-256/source metadata/reference-only
association). Browser verification covered 1600×1000, 1280×800, and 390×844, including GOES loaded vs blocked.

**Docs updated.** `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`,
`docs/ASSET_ATTRIBUTION.md`, `docs/ASSET_PIPELINE.md`, `docs/PRODUCT_DESIGN.md`, `docs/UX_UI_GUIDELINES.md`,
`docs/ROADMAP_AND_ACCEPTANCE.md`, `docs/DECISIONS.md`.

### 2026-10-21 — Phase 3.6 Solar System Overview and mode switch

**Context.** The Phase 3.5 Earth Orbit Lab was complete and uncommitted. The owner asked for a default,
source-aware Solar System Overview with the Sun and eight planets, at least three new local NASA assets,
selectable/focusable bodies, and a reversible switch to the preserved Lab. Constraints: no physics changes,
no N-body/planetary dynamics, no live positions or dates, no new dependencies, no runtime third-party asset
fetches, and no Git publication operations.

**Choices made.**

1. **The Overview is a separate, static reference screen.** It imports no simulation, scenario, comparison,
   or result code and computes no dynamics. `src/solarSystem/bodies.ts` owns display radii, compressed orbit
   radii, fixed composition angles, kind labels, fallback colours, optional texture metadata, and camera poses.
   These are scene-composition values, never physical units or ephemeris data.
2. **Landing on the Overview does not execute the engine.** `App.tsx` keeps comparison state outside both
   screens and creates the initial Lab baseline only on the first switch to the Lab. Returning to the Overview
   and back preserves the baseline, candidate, draft, selection, cursor position, and records; the switch is
   not a reset. Switching to the Overview pauses playback so it does not advance while hidden, and focus moves
   to the destination heading/main region because the clicked mode tab is unmounted.
3. **Four non-Earth NASA textures, not a full texture set.** Mars, Jupiter, Venus, and Neptune use local NASA
   3D Resources images totalling 2,576,276 bytes (about 2.46 MiB): Mars 1,440 × 720 / 972,896 B, Jupiter
   720 × 360 / 225,878 B, Venus 1,440 × 720 / 1,166,974 B, Neptune 720 × 360 / 210,528 B. The Sun, Mercury,
   Saturn, and Uranus use procedural display materials; Saturn's ring is procedural geometry. Every textured
   body has a documented procedural-colour fallback, and no runtime third-party request is made.
4. **Source semantics stay visible.** Texture records in the registry carry the source page, original file
   URL, source label, credit, dimensions, and byte size. The screen and public README credit NASA / Jet
   Propulsion Laboratory & Caltech for Mars (Viking imagery processed at USGS), JPL & Caltech for Jupiter,
   NASA/JPL-Caltech for Venus (inferred from the JPL/Caltech planetary-map database; the source page has no
   separate credit line), and Don Davis & JPL/Caltech for Neptune. Venus is identified as a radar-derived
   surface map, not natural colour; Neptune is identified as an illustrative/fictional texture, not an
   observational map.
5. **Labels are DOM, not 3D text.** Body labels are buttons positioned from the camera projection each frame;
   this keeps them readable, selectable, and accessible without a label dependency. Camera focus and the
   **Overview view** reset change framing only and never mutate physical state.
6. **Honesty is part of the composition.** The scene carries **REFERENCE VISUALIZATION**, **NOT TO SCALE**,
   and "no simulated time" labels; the body list and details state that positions are illustrative, orbit
   guides indicate order only, and the Overview does not feed sizes or positions into the Lab. No live
   position, date, weather, telemetry, or planetary motion is shown.
7. **No new dependency and no physics change.** The implementation reuses React Three Fiber, Drei, and the
   existing texture-loading pattern. `src/simulation/`, the comparison math, playback, and cached-reference
   semantics are unchanged.

**Alternatives considered.** A live JPL Horizons planetary ephemeris (rejected: it would add a data/epoch
pipeline and imply accuracy the static reference view does not need); an N-body or Keplerian animation
(rejected: out of scope and a second physics path); Solar System Scope textures (rejected: the official NASA
3D Resources set keeps provenance consistent); a texture for every body (rejected: four reviewed maps meet
the requirement while keeping the payload small); GLB planet models (rejected: no need for the schematic
view and no compatibility review); a separate route or page reload for each mode (rejected: it would discard
in-memory comparison records); Drei 3D text labels (rejected after review: projected DOM labels are more
readable and testable); true-scale distances (rejected: unreadable at the target viewport and not the purpose
of the reference view).

**Consequences and follow-ups.** The app now opens on a reference surface rather than the Lab, which is a
deliberate first-run change. The Overview is static and limited to the Sun and eight planets; it has no moons,
live data, rotation, scale accuracy, or ephemeris. The four planetary images add about 2.46 MiB. Browser
verification at 1600×1000, 1280×800, 900×800, and 390×844 covered the default landing, selection/focus,
mode switching, Lab record preservation, all six local assets, WebGL 2, console, and network; it found no
horizontal overflow, failed requests, external requests, console errors, or page errors. The details panel
and viewport credit distinguish NASA Earth Observatory from NASA 3D Resources. Switching to the Overview
pauses playback and moves focus to the destination heading/main region. The narrow-layout pass also fixed
collapsed stacked columns and a phone-width horizontal overflow discovered during that check.

**Tests added.** `src/app/__tests__/overviewView.test.tsx` (default landing with an engine probe proving the
two-body engine is not executed, body selection/details, camera reset, mode switch and record preservation),
`src/solarSystem/__tests__/bodies.test.ts` (registry/order/display metadata/texture provenance, exact four
assets, Earth Observatory attribution), and `src/scene/__tests__/planetSurface.test.ts` (texture-or-fallback
material state). Existing workspace/reference tests now enter the Lab explicitly through
`src/app/__tests__/renderEarthLab.tsx`.

**Docs updated.** `README.md`, `docs/ARCHITECTURE.md`, `docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`,
`docs/ASSET_ATTRIBUTION.md`, `docs/ASSET_PIPELINE.md`, `docs/UX_UI_GUIDELINES.md`,
`docs/ROADMAP_AND_ACCEPTANCE.md`, `docs/DECISIONS.md`.

### 2026-10-20 — Phase 3.5 visual foundation and local Earth assets

**Context.** The Phase 3 cached-reference vertical slice was complete and uncommitted. The owner asked for a
UI/UX and visual-foundation pass using three supplied composition references, while preserving the physics
engine, units/frame/epoch provenance, immutable baseline/candidate records, and sample-quantized playback. The
references read as Solar System Scope compositions rather than the current Antennae screen, so the actual
before state was captured from the running app and the images were used for composition and hierarchy only.

**Choices made.**

1. **The scene is the workspace.** On desktop the canvas is full-bleed; compact object/reference and
   inspector/results columns float at its edges. The complete comparison chart moves into a bottom analysis
   drawer that is collapsed by default and opens only on an explicit **Show chart** action. Below 1180 px the
   panels stack rather than squeezing the scene.
2. **Two local NASA Blue Marble textures, display-only.** The Earth surface is
   `public/assets/earth/blue-marble-2048.jpg` and a static cloud layer is
   `public/assets/earth/blue-marble-clouds-2048.jpg`: 2048 × 1024 JPEGs, 266,599 and 829,367 bytes, about
   1.05 MiB total. NASA attribution, exact URLs, checks, and usage guidance are in
   `docs/ASSET_ATTRIBUTION.md` and the public README. If the surface fails to load, the scene keeps the
   procedural Earth; a missing cloud texture omits the cloud shell. Both files are served from the app origin;
   there is no provider/live-texture request.
3. **Visual effects stay honest.** The cloud image is not current weather; the atmosphere shell, marker halo,
   deterministic procedural star field, and Orbit/Earth camera framing are presentation only and never feed back
   into physical state. The Earth is not animated, so no rotation or live weather is implied. No GOES 3D model
   was added because the optional asset was not needed for this point-particle visualization and its
   compatibility/provenance was not verified.
4. **The chart keeps its data contract.** The altitude chart uses adaptive tick precision derived from the tick
   spacing so a nearly flat LEO axis no longer prints repeated `400` labels, while GEO-scale charts still label
   thousands. No series is resampled, extended, or otherwise changed by the formatting fix.
5. **Attribution is reachable.** The viewport credit link, the model-and-limitations disclosure, and the public
   README carry the NASA Blue Marble source and media-usage guidance. No NASA insignia/logo or Solar System
   Scope branding is used.

**Alternatives considered.** Importing Solar System Scope textures or branding (rejected: identity/licensing
questions and we only needed composition guidance); a large Earth mesh or HDRI/star panorama (rejected: size and
no visual need); animated clouds or Earth rotation (rejected: would imply unsupported weather/rotation); a
charting library (rejected: the existing dependency-free SVG chart meets the need); default-open chart (rejected:
it would constantly take the majority of the scene); an optional GOES model (deferred, as above).

**Consequences and follow-ups.** The viewport, panels, status row, chart drawer, and local texture fallback were
checked at 1600×1000 and 1280×800 with no horizontal overflow; the primary reference-load and run-candidate
actions remain visible without scrolling. Physics, comparison math, and cached-vector semantics are unchanged.
The Three.js bundle-size warning remains pre-existing. The layout below 1180 px is implemented but was not part of
the two required browser viewport checks.

**Docs updated.** `README.md`, `AGENTS.md`, `docs/ASSET_ATTRIBUTION.md`, `docs/ASSET_PIPELINE.md`,
`docs/ARCHITECTURE.md`, `docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`, `docs/UX_UI_GUIDELINES.md`,
`docs/ROADMAP_AND_ACCEPTANCE.md`, `docs/DECISIONS.md`.

### 2026-10-20 — Cached JPL Horizons reference preset (Phase 3)

**Context.** The owner resumed product development after the OpenCode tooling experiment was rolled back. The
roadmap's first unimplemented product phase is Phase 3: one curated NASA/JPL-inspired preset with provenance,
a provider adapter with validation/conversion, and a cached fallback. The exact dataset was still an open
decision; this entry records the scoped choice made for the first vertical slice.

**Choices made.**

1. **One cached target, not a live catalogue.** The preset is GOES-16 (`-141866`), a NOAA geostationary weather
   satellite. A single JPL Horizons VECTORS geometric state at 2026-10-20 00:00:00.0000 TDB (JD 2461333.5) is
   cached from the official API. The exact query, retrieval time (2026-10-20T08:11:49Z), API signature version,
   and source URL are retained. No live network request or refresh action exists in this milestone.
2. **Provider shape stops at `src/data/`.** `horizons.ts` parses the Horizons `result` table and rejects malformed
   tables, multiple rows, non-finite values, and unsupported center/frame/units/time-scale/output-type
   combinations. `referencePresets.ts` builds the normalized preset; UI components never see the provider shape.
3. **Exact state when loaded; circular approximation only after an explicit edit.** `ScenarioInputs.reference`
   carries the validated preset. `buildScenarioConfig` uses the cached position/velocity unchanged. Editing
   altitude or speed detaches the exact vector, moves the source preset to `derivedFrom`, and uses the derived
   circular parameters; the source provenance and original vector remain attached but are not propagated. The UI
   labels that conversion and the model notice explains it. A reference run and a circular run with the same
   numbers are not treated as the same inputs.
4. **Provenance and limitations are part of the feature.** The panel shows provider, target, epoch, frame,
   center, units, retrieval time, API version, exact vector, query, and source. The model notice distinguishes
   the provider's initial vector from the hypothetical trajectory produced by this two-body engine. The TDB
   epoch is audit metadata; the model has no epoch/time-scale handling. ICRF axes are used directly as the
   model's Earth-centered inertial axes, with no frame rotation.
5. **The editable altitude range was widened to 50,000 km.** The GOES-16 radius implies about 35,787 km altitude,
   beyond the previous 20,000 km UI cap. The engine's numeric range is much wider; this is a UI-range change, not
   a physics change. Reference inputs bypass the circular altitude/speed range checks and are validated through
   their exact state by the engine.
6. **Fail malformed data, never substitute.** If the fixture cannot be parsed, the panel reports the cached
   reference as unavailable; the synthetic baseline remains usable and no different target or synthetic state is
   silently substituted.
7. **No new dependency.** The parser, fixture, and provenance use the existing TypeScript/simulation utilities;
   no HTTP client, schema library, or chart dependency was added.

**Alternatives considered.** A live Horizons request with cached fallback (deferred: browser CORS, rate/terms,
and offline reliability are additional scope; the roadmap explicitly allows a cached fallback); a synthetic
preset merely citing NASA constants (rejected: it would not exercise provider parsing or provenance of an actual
state); using only the derived circular altitude/speed (rejected: it would discard the exact provider vector and
hide the distinction between source data and a hypothetical approximation); loading multiple targets (rejected:
one complete vertical slice first); interpolating or refreshing the state at runtime (rejected: no live service
or epoch handling exists).

**Consequences and follow-ups.** The reference trajectory is not the satellite's real ephemeris and must never be
presented as one. There is no live refresh, no additional target catalogue, and no general frame/epoch
transformation. The cached fixture adds a small amount of bundle data. The next dependency is Phase 4's mission
template/evaluator; a future data milestone may add live refresh and more curated targets after terms,
rate-limit, CORS, and provenance handling are designed.

**Tests added.** `src/data/__tests__/horizons.test.ts` (parsing, exact values, malformed/unsupported payloads),
`src/data/__tests__/referencePresets.test.ts` (provenance/state), `src/scenarios/__tests__/scenarioInputs.test.ts`
(exact-state build, geostationary validation, labels), `src/comparison/__tests__/records.test.ts` (load/run/edit/
promote/restore integrity), and `src/app/__tests__/referencePresetView.test.tsx` (provenance panel, load-without-
run, exact-state run, circular conversion). Existing workspace timing/limit expectation was updated for the new
50,000 km UI cap.

**Docs updated.** `README.md`, `docs/ARCHITECTURE.md`, `docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`,
`docs/DATA_SOURCES.md`, `docs/ROADMAP_AND_ACCEPTANCE.md`, `docs/DECISIONS.md`.

### 2026-10-19 — Milestone 3 comparison decisions

**Context.** The owner authorized Milestone 3: compare a baseline run with a modified candidate run and
understand how one changed initial condition affects the computed trajectory. Constraints: no new physics or
force models, no new data sources or assets, no mission scoring or AI, no chart dependency unless necessary,
and no Git history operations.

**Choices made.**

1. **Run records bundle parameters, configuration, and result.** `src/comparison/records.ts` defines
   `ScenarioRecord = { role, inputs, config, result }`. Every panel reads a record, never loose values, so the
   displayed comparison cannot mix numbers from different configurations. Records are treated as immutable:
   the state helpers return new state objects and never mutate an existing record, which is what makes
   "editing the candidate cannot change the baseline" a structural property (asserted by object-identity tests)
   rather than a convention.
2. **Edits are parameters, runs are explicit — this supersedes the Milestone 2 behaviour** where typing a new
   altitude immediately re-ran the engine. Editing now changes only the candidate *draft*; the engine is
   called when the user selects **Run candidate**. Reason: the milestone requires a labelled
   "Run candidate" step, and an implicit run makes it impossible to state which configuration a displayed
   chart belongs to while the user is mid-edit. The UI compensates with an "Unrun changes" chip and an explicit
   note that the chart still shows the last candidate run together with the parameters that produced it.
3. **Invalid candidate runs change nothing.** A rejected run reports the engine's own validation messages and
   keeps the previous candidate record and the baseline exactly as they were (verified by identity assertions).
   The rejected values stay in the draft so the user can correct them.
4. **Restore re-runs; promote is confirmed.** "Restore baseline parameters" copies the baseline parameters into
   the candidate *and runs them*, so the restored candidate is bound to a configuration rather than to a stale
   result; deterministic engine output makes it reproduce the baseline sample-for-sample, which the summary
   shows as a zero difference. "Replace baseline with candidate" is a two-step inline confirmation (no browser
   dialog), and it clears the now-duplicate candidate record and resets the draft to the new reference so the
   next comparison starts from it.
5. **Comparison point is a shared recorded sample, never an interpolated time.** `commonComparisonPoint`
   selects the latest simulated time recorded by *both* runs, matching exact timestamps quantized to
   microseconds to absorb binary representation noise. Differences (altitude, radius, speed, specific orbital
   energy) are computed at that sample only. If the grids share no timestamp, the result is `null` and the UI
   states that differences are unavailable instead of interpolating.
6. **The chart is dependency-free SVG.** No charting library is installed and the milestone needs exactly two
   series, labelled axes, and honest handling of unequal run lengths, so `AltitudeChart.tsx` renders an inline
   SVG from `AltitudeSeries` and `src/app/altitudeChartMath.ts` holds the single physical-to-view mapping.
   Lines connect recorded samples in time order; that visual connection is not a computed state, which the
   panel states in words.
7. **Runs keep their own grid and duration.** Series are never resampled, padded, or extended: a shorter run
   ends earlier on the shared time axis, and a stopped run ends at its last recorded sample. Every mention of a
   final time is labelled "final recorded …" and, when the engine stopped early, is qualified with the
   requested duration rather than being reported as it.
8. **Units stay physical.** Altitude is `|position| − mean Earth radius` in kilometres from the engine's sample
   vectors; the chart never uses the viewport's scene-unit transform.
9. **Playback and visibility are independent of records.** The top bar switches which record the viewport and
   timeline follow; playback reset, stepping, and scrubbing only move a cursor, so they can never clear or
   modify the baseline or the candidate.
10. **Unrun-changes semantics.** Before any candidate run, deviation from the baseline parameters is already
    flagged as "Unrun changes"; afterwards the candidate record is the comparison point. Matching parameters
    exactly returns the state to "not run" or "in sync" respectively.

**Alternatives considered.** Adding a chart library such as Chart.js (rejected: one more rendering dependency
for two series, and its automatic scales/missing-value behaviour works against the honesty rules);
interpolating both runs onto a common time grid (rejected: it would manufacture physical samples the engine
never recorded); comparing at the shorter run's end without requiring a shared timestamp (rejected: the value
would be a guess); keeping the candidate record after promotion (rejected: it would show the same run twice
under two labels); running the candidate on every keystroke (rejected: see choice 2); using `window.confirm`
for baseline replacement (rejected: harder to test and less explicit about the consequences).

**Consequences and follow-ups.** `src/comparison/` is framework-independent and unit-tested; the physics core
and the viewport were not modified. The extra interaction step is the cost of comparison integrity. Known
limitations carried forward: the chart draws one polyline per run, so a run with very many samples produces a
long `points` attribute; the travelled/future trajectory contrast is still brightness-only; the bundle grew to
~1.21 MB minified (~335 kB gzip) because the milestone added code but no dependency, so code-splitting remains a
later optimization; there is still no mission template, no NASA/JPL preset, no persistence, and no deployment.

**Tests added.** `src/comparison/__tests__/records.test.ts` (state transitions and record immutability),
`src/comparison/__tests__/compareRuns.test.ts` (series, endpoints, stopped runs, common comparison point),
`src/app/__tests__/altitudeChartMath.test.ts` (scale/tick math), and
`src/app/__tests__/comparisonView.test.tsx` (UI flow, including chart geometry checks against the shared time
axis). `src/app/__tests__/workspace.test.tsx` was updated to the explicit-run semantics.

**Docs updated.** `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP_AND_ACCEPTANCE.md`,
`docs/UX_UI_GUIDELINES.md`, `docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`, `docs/DECISIONS.md`.

### 2026-10-19 — Milestone 2 workspace decisions

**Context.** The owner authorized Milestone 2: a minimal 3D workspace that renders actual output from the
existing two-body core. Constraints: no new physics, no external assets, no live data, no AI, no
persistence, and no Git history operations.

**Choices made.**

1. **Dependencies.** Added `three` 0.186.1, `@react-three/fiber` 9.8.2, `@react-three/drei` 10.7.9, and
   dev-only `@types/three`. Only `OrbitControls`, `GizmoHelper`, `GizmoViewport`, and `PerspectiveCamera`
   from Drei are used; the trajectory is drawn with plain `THREE.Line` objects so playback updates cost no
   per-frame allocation. No asset loader, post-processing, or state library was added.
2. **Browser verification tooling.** Added dev-only `jsdom`, `@testing-library/react`, `@testing-library/dom`,
   and `@testing-library/user-event` so the required interaction flows (run, pause, reset, step, time scale,
   editing an initial condition, invalid input, stopped run) are exercised against the real component tree
   instead of being claimed. DOM tests declare `@vitest-environment jsdom` per file; the default environment
   stays `node`.
3. **UI never computes physics.** `src/scenarios/` builds a `SimulationConfig` from editable inputs by reusing
   `createCircularOrbitState` (position on +x, velocity on +y) and scaling the velocity magnitude — no axis or
   frame logic is re-implemented. `src/results/` derives every displayed metric through the engine's own
   `derivedMetrics` utilities. The viewport consumes `SimulationResult.samples` only.
4. **Display-scale transform.** The viewport converts kilometres to scene units with one uniform factor
   (1 scene unit = 1,000 km), so the central body and the orbit keep their real proportion. The transform is
   one-way and never influences simulation state. Marker size and line widths are exaggerated, and the
   viewport carries a visible **NOT TO SCALE** label plus a sentence stating exactly what is exaggerated.
5. **Sample-quantized playback.** The playback cursor moves through recorded samples only. Run/pause/reset,
   ±1-sample stepping, scrubbing (snapped to the nearest recorded sample), and 10x–1000x time scales
   (simulated seconds per real second) change nothing physical. No interpolated or extrapolated state is ever
   drawn or reported; the finest available resolution equals the integration timestep, which the UI states.
6. **Playback is bounded by recorded time.** A run that stopped early ends at its last recorded sample. For
   geometric-limit stops the engine deliberately does not record the offending state, so the playable timeline
   can end before `completedDurationSeconds`; the UI shows both numbers with that explanation rather than
   extrapolating.
7. **Invalid input never integrates.** Out-of-range or unparseable input produces the engine's own messages and
   leaves the last valid run on screen, marked as such. Numeric text fields commit on Enter or blur so a
   half-typed decimal cannot be reinterpreted mid-keystroke; sliders commit immediately.
8. **Procedural geometry only.** The central body is a smooth sphere with the documented mean radius; there
   are no models, textures, or downloaded assets, so `docs/ASSET_ATTRIBUTION.md` stays empty.
9. **Camera is a display concern.** Framing is derived from the current run's largest sampled radius and is
   applied as declarative props, so a user's orbit/zoom survives playback frames and the scene never writes to
   camera state from simulation data.

**Alternatives considered.** A non-uniform radial exaggeration (rejected: it would misrepresent altitude even
though it looks better for low Earth orbit); drawing the traveled path with a thick meshline geometry (rejected
in favour of draw-range updates that allocate nothing per frame; the contrast is carried by brightness);
interpolating marker positions for smoothness (rejected: it would present states the engine never computed);
`try`-ing to keep the engine's `completedDurationSeconds` as the playback bound (rejected: it would animate
past recorded data); committing numeric text on every keystroke (rejected: it breaks decimal entry).

**Consequences and follow-ups.** The workspace is a thin, testable visual layer; the physics core was not
modified. Bundle size is ~1.19 MB minified (~329 kB gzip) because of Three.js — code-splitting is a later
optimization, not a correctness issue. The energy-based stability rule is still valid only for this
conservative model. `npm run dev`/`preview` are usable but the project still has no deployment, persistence,
NASA/JPL data, or AI.

**Docs updated.** `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP_AND_ACCEPTANCE.md`,
`docs/UX_UI_GUIDELINES.md`, `docs/DECISIONS.md`.

### 2026-10-18 — Milestone 0/1 foundation decisions

**Context.** The project restarted in a fresh directory that contained only the design PDF and an
earlier "agent guides" pack. No code existed. The owner asked for an English-only foundation plus an
isolated two-body physics core, without Git operations, external assets, live APIs, or AI.

**Choices made.**

1. **Leftover guide-pack files removed.** `GUIDE_INDEX.md`, `INSTALL.md`, `MULAI_DI_SINI.md`, and
   `PROMPT_AUDIT_PERTAMA.md` were deleted **with explicit owner approval**, because two were written
   in Indonesian (conflicting with the English-only rule), all four duplicated content now carried by
   `README.md`, `AGENTS.md`, and `docs/`, and `INSTALL.md` described installing a ZIP bundle that no
   longer applies. The design PDF was not touched.
2. **Stack.** React 19 + TypeScript + Vite 8 generated from the official `react-ts` template, npm for
   packages, Vitest 5 for tests, oxlint (template default) for linting. No Three.js, chart library,
   AI SDK, or NASA API client was added.
3. **Physics scope.** One model only: a massless test particle orbiting a fixed central body
   (Earth) under point-mass gravity `a = -mu r / |r|^3`. No N-body, thrust, propellant, drag,
   relativity, or ephemeris handling.
4. **Units and frame.** km, seconds, kg, km/s, km^3/s^2; Earth-centered right-handed inertial axes in
   the EME2000-family orientation, with **no attached epoch and no time-scale handling**, because the
   implemented forces are time-independent. Earth GM = 398600.4418 km^3/s^2, recorded locally.
5. **Integrator.** Fixed-step kick-drift-kick leapfrog (velocity Verlet), chosen for symplectic,
   second-order, bounded-energy-error behavior on this separable conservative system; one new
   acceleration evaluation per step.
6. **Timing contract.** `durationSeconds` and `sampleIntervalSeconds` must be integer multiples of
   `timestepSeconds` (1e-9 relative tolerance). Partial final steps are rejected rather than silently
   integrated, so results are never a mix of full and truncated steps.
7. **Determinism.** The runner is a pure function of its config: no randomness, clock, or I/O. Results
   carry no timestamps; timestamps belong to a future persistence layer, which keeps reproduced runs
   byte-comparable.
8. **Honest failure behavior.** Invalid input throws `SimulationInputError` with per-field issues.
   Runs stop with explicit warnings when (a) the configured impact radius is crossed, (b) separation
   falls below a numeric floor, (c) a non-finite value appears, or (d) relative specific-orbital-energy
   deviation exceeds 10% — the last one because energy is exactly conserved by this model's continuous
   dynamics, so a large deviation means the fixed-step result is untrustworthy. A large step relative
   to the local orbital period produces a `COARSE_TIMESTEP_ADVISORY` without stopping the run.
9. **Presets are synthetic.** The circular Earth-orbit preset is an explicit educational idealization
   and is NOT a NASA/JPL-sourced state vector. It carries no provenance beyond "constructed from the
   documented constants", and it is not presented as a real spacecraft.
10. **No external or irreversible actions.** No Git initialization, commits, or publishing; no asset
    downloads; no live API calls; no AI provider configuration.

**Alternatives considered.** RK4 (non-symplectic, secular energy drift, four evaluations per step);
adaptive-step integrators (more complexity than an introductory core needs, and harder to make
bit-deterministic); accepting partial final steps (rejected for the timing contract); silently
rounding the duration (rejected: it would hide a user's intent); omitting the energy-based instability
stop (rejected once a probe showed a plunge run "completing" with a numerically slingshot, unbound
state).

**Consequences and follow-ups.** The core is small, deterministic, and testable, but it cannot
represent real trajectories, and no UI consumes it yet. The energy-based stop is valid only for this
conservative model and must be redesigned when thrust or time-dependent forces are added. Recorded
constants still need provenance verification against live sources before being presented as sourced
data.

**Docs updated.** `README.md`, `docs/DECISIONS.md`, `docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`,
`docs/ARCHITECTURE.md`, `docs/ROADMAP_AND_ACCEPTANCE.md`, `docs/DATA_SOURCES.md`,
`docs/REFERENCE_NOTES.md`, `docs/AI_AGENT_WORKFLOW.md`, `.agents/rules/implementation.md`.

## Open decisions that must not be silently guessed

Status as of 2026-10-21. Items marked DONE were resolved by the foundation, reference-data, visual-foundation,
Solar System Overview, or Mission Designer milestones; the rest remain open and must not be assumed.

1. Which official NASA Space Apps 2026 challenge and exact deliverable will the team target? **Open.**
   The design PDF's candidate is Space Mission Design Game (#13); verify the live brief before committing.
2. What does the repository already contain? **DONE.** See the repository-state row and the 2026-10-18 decision log entry.
3. Which first mission template is physically supportable and easy to demonstrate? **DONE for one template:** Design a Stable Circular Earth Orbit, limited to the implemented two-body initial-condition model. Additional mission templates remain open.
4. What units, frame, epoch/time scale, and central-body convention will the simulation use internally? **DONE
   for the current model** (km/s/kg; Earth-centered inertial axes, no epoch, no time scales). The cached
   reference preset introduces provider ICRF/TDB metadata; the model still applies no frame rotation or
   epoch/time-scale handling, and that approximation is disclosed. Revisit before any real-ephemeris claim.
5. Which force model and integrator will be implemented and benchmarked first? **DONE.** Two-body point mass with fixed-step kick-drift-kick leapfrog; N-body and thrust remain open.
6. Will the mission model include spacecraft thrust/propellant, or only orbital initial conditions? **Open.** Not implemented; the physics core models no thrust.
7. Which exact JPL/NASA endpoints, query parameters, and cached fixtures will be used, and what are their usage
   restrictions? **Partly resolved.** One cached GOES-16/JPL Horizons VECTORS query/fixture is implemented
   (2026-10-20 decision entry), with provenance and no runtime request. Live refresh, additional targets, and
   broader provider-terms review remain open.
8. Which AI provider/endpoint will be used in the deployed app, and what fallback is required? **Open.** No AI integration exists yet.
9. What hosting/deployment method and secret-management options are available? **Open.**
10. What is the intended first-user skill level, and is any Indonesian/bilingual presentation needed? **Partly resolved:** English-only is decided for repository artifacts and UI copy; any bilingual *product* experience remains a product question for the owner.
11. Which exact 3D models and surface textures should be selected, and are their licenses/attribution requirements compatible with repository bundling and deployment? **DONE for the current visual pass.** Six NASA texture files and one NASA GOES-R GLB are selected, checked, attributed, and locally bundled: two Earth Observatory Blue Marble images, four NASA 3D Resources maps, and the official GOES spacecraft model (render-only). See `docs/ASSET_ATTRIBUTION.md` and the 2026-10-21 Phase 4 decision entry. Any future model/texture still needs the same item-level review; the GLB's source page has no separate creator/copyright line, which remains an explicit uncertainty.
12. What asset budget (bundle size, texture resolution, polygon count, load-time target) is acceptable for the first deployed demo? **DONE for this pass:** six JPEGs total 3,672,242 bytes (about 3.50 MiB); the GOES GLB adds 6,439,892 bytes (about 6.14 MiB), for 10,112,134 bytes (about 9.64 MiB) of local visual assets. No HDRI. The GOES file is loaded only on demand and the pre-existing Three.js chunk-size warning remains a future optimization topic.

## Decision update format

When a decision is made, add a dated entry containing: context/problem, choice, alternatives considered, rationale, consequences, and whether related docs/code/tests were updated. Do not rewrite a historical decision to make the timeline look cleaner; supersede it with a newer entry.
