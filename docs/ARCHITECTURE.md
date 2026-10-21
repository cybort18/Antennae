# Architecture — Antennae / Space Sandbox

**Status:** recommended logical architecture, to be reconciled with the actual repository before implementation. Section 8 records what actually exists today.

## 1. Dependency direction

Keep UI/rendering, scenario state, physics, external data, result analysis, and AI explanation separate. They may initially ship in one frontend application plus a small server-side adapter, but they should not be coupled into one component.

Recommended logical flow:

```text
React UI
  ├─ 3D Scene (Three.js / React Three Fiber)
  ├─ Object & Mission Inspector
  ├─ Playback Controls
  ├─ Results / Charts / Comparison
  └─ AI Science Copilot UI
          │
          ▼
Scenario Manager & Validation
  ├─ Scenario versions and presets
  ├─ Unit/frame-aware state
  ├─ Baseline and candidate states
  └─ Run configuration
          │
      ┌───┴────────────┐
      ▼                ▼
Physics Engine     Data Adapter / Cache
      │             ├─ JPL Horizons
      │             ├─ JPL Small-Body/SSD sources
      │             └─ Provenance / fallback
      ▼
Simulation Results & Mission Evaluator
          │
          ├─ Charts and status UI
          └─ Structured context → AI Explanation Service
```

## 2. Responsibility contracts

### UI and scene renderer

The rendering layer may load curated third-party meshes and textures. Before any such asset is shipped, review its license and usage terms, record the attribution that license requires, and keep physical properties and scenario state independent from render geometry and display scale. Asset-load failures must degrade to a placeholder rather than alter or block the simulation state. The current build loads six local NASA textures (Earth surface and static clouds plus four planetary maps in the Overview) with procedural fallbacks; it has no general model loader.


Render scenario state, labels, object selection, trajectories, vector overlays, and controls. It must not independently calculate authoritative physics. Visual scaling must not mutate physical values.

### Scenario manager

Own object definitions, presets, scenario versions, input validation, active configuration, baseline/candidate copies, and save/load/export. Track changes so stale results can be invalidated or clearly tied to the earlier scenario version.

### Physics engine

Be deterministic for identical valid inputs and configuration (unless a later model explicitly adds recorded randomness). Accept an explicit initial state and configuration; return sampled states, relevant events, derived metrics, warnings, and validity/status metadata. Do not depend on React or Three.js rendering state.

### Data adapter

Fetch/parse/normalize external data into internal types, validate units/frame/epoch and required fields, cache permitted data, and preserve provenance. Keep provider-specific response shape at the adapter boundary.

### Mission evaluator

Evaluate explicit predicates against calculated outputs: for example, target state/region tolerance, allowed simulation duration, or modeled propellant budget. It must not use visual appearance or LLM judgments to mark a mission successful.

### Results service / chart layer

Use result records tied to scenario version, model configuration, and run ID. Do not invent missing values to make charts look complete.

### AI explanation service

Build a structured context from scenario and result records. The model explains supplied calculations and limitations; it does not become an alternate numerical engine. API secrets stay server-side.

### Persistence

Prefer local scenario persistence and JSON export for an MVP. Add account/cloud persistence only when required. Provide a way to recover/export work rather than risking silent loss.

## 3. Candidate frontend stack

If the repository has not selected a stack already, the starting proposal is React + TypeScript, Three.js with React Three Fiber/Drei for the scene, a chart library for result plots, and a rendering-independent TypeScript simulation module. Select dependencies based on repository constraints and keep the total dependency surface small.

Do not treat this suggested stack as authorization to overwrite an existing scaffold or introduce a new framework unnecessarily.

## 4. Candidate repository structure

Adapt names to existing conventions; do not perform a broad restructure solely to match this diagram.

```text
src/
  app/             # routes, page composition, shell
  components/      # reusable UI controls, panels, dialogs
  scene/           # rendered bodies, camera, trails, overlays
  scenarios/       # presets, schema, validation, save/load
  simulation/      # units, state vectors, force models, integrators
  missions/        # objectives, constraints, score/evaluation
  data/            # JPL adapters, parsing, cache, provenance
  results/         # result types, derived metrics, comparison
  ai/              # context builder and Copilot UI/service
  types/           # shared domain contracts
  tests/           # unit and scenario/integration tests
server/            # optional proxy for secrets or external APIs
docs/              # decisions, assumptions, API/data contracts
```

## 5. Suggested domain contracts

Types below are illustrative; implement precise types after the force model, frame and unit conventions are finalized.

```ts
type Vec3 = { x: number; y: number; z: number };
type UnitSystem = {
  distance: "m" | "km";
  time: "s";
  mass: "kg";
};
type Provenance = {
  source: "JPL_HORIZONS" | "JPL_SSD" | "NASA_FACTSHEET" | "USER_DEFINED" | "CACHED_FIXTURE";
  targetId?: string;
  retrievedAt?: string;
  epoch?: string;
  center?: string;
  frame?: string;
  units: UnitSystem;
};
type SimulationObject = {
  id: string;
  name: string;
  kind: "body" | "asteroid" | "spacecraft";
  massKg?: number;
  radiusKm?: number;
  position: Vec3;
  velocity: Vec3;
  isUserModified: boolean;
  provenance?: Provenance;
  visual?: { color?: string; displayScale?: number };
};
type SimulationConfig = {
  model: "two-body" | "n-body" | "mission-thrust";
  integrator: string;
  timestepSeconds: number;
  epoch: string;
  forceModelVersion: string;
};
type SimulationRunStatus = "ready" | "running" | "completed" | "stopped" | "invalid" | "unstable";
```

There are no compatibility guarantees for these sample shapes yet; do not copy them mechanically if the selected model requires different fields. Avoid representing incompatible combinations as valid states.

## 6. Versioning and state integrity

- Each scenario revision should be identifiable.
- A result is valid only for the exact initial state and model configuration that produced it.
- Preserve a baseline reference when creating a modified scenario.
- Include model, integrator, timestep, epoch, force assumptions, and units in saved/reproducible runs.
- A modification should visibly mark a data-derived scenario as hypothetical.

## 7. Failure isolation

- If rendering fails, calculations/state should not be silently altered.
- If a data provider fails, load a clearly identified cached preset or display an error; do not substitute unrelated data.
- If a run becomes unstable, stop or mark it invalid and suppress misleading results.
- If AI fails, retain the simulation and results UI.
- If a mission metric is not represented by the current model, say unavailable and do not guess.

## 8. Implementation status in this repository (2026-10-21)

### Implemented

`src/simulation/` — the isolated physics core. It is framework-independent: it imports no React,
Three.js, or browser API, and it is verified by `src/simulation/__tests__/` (8 files, 72 tests).

The UI, data, comparison, scenario, result, scene, and solar-system modules are verified by 16 further test
files, including DOM interaction tests that drive the real component tree
(`src/app/__tests__/workspace.test.tsx`, `src/app/__tests__/comparisonView.test.tsx`,
`src/app/__tests__/referencePresetView.test.tsx`, `src/app/__tests__/overviewView.test.tsx`). The WebGL
viewports are replaced by stubs in those tests because jsdom has no WebGL context; the rendered scenes were
verified separately in a real browser.

`src/data/` — the cached reference-data boundary. It holds a provider-shaped JPL Horizons VECTORS fixture, a
parser that enforces Earth body center, ICRF, TDB, geometric-state, and KM-S conventions, and one validated
preset with provenance. It imports simulation types/utilities but no React or Three.js. There is no live fetch
and no runtime cache service in this milestone.

| Module | Responsibility |
|---|---|
| `units.ts` | Internal unit system and the Earth-centered inertial frame convention |
| `constants.ts` | Documented constants (Earth GM, mean radius, G, Earth mass) with provenance notes |
| `vector3.ts` | Minimal `Vec3` primitives |
| `errors.ts` | `ValidationIssue`, `SimulationInputError` |
| `types.ts` | `StateVector`, `CentralBody`, `SimulationConfig`, `SimulationResult`, warnings, status |
| `validation.ts` | Input validation and numeric guard rails |
| `forceModel.ts` | Central-body point-mass acceleration |
| `integrators.ts` | Fixed-step kick-drift-kick leapfrog step |
| `derivedMetrics.ts` | Energy, angular momentum, eccentricity, circular speed/period |
| `runSimulation.ts` | Deterministic bounded runner producing samples, diagnostics, warnings, status |
| `presets.ts` | Synthetic ideal circular Earth-orbit preset (not NASA/JPL data) |
| `index.ts` | Public API surface of the core |

Also implemented: the Vite/React/TypeScript scaffold; the workspace UI described below; and the npm
scripts `dev`, `build`, `typecheck`, `lint`, `test`, `test:watch`, `preview`.

| UI module | Responsibility |
|---|---|
| `App.tsx` | Composition root: owns UI state (comparison records, selection, displayed record, playback) and nothing numerical |
| `scenarios/scenarioInputs.ts` | Editable inputs, limits, reference values, `SimulationConfig` builder |
| `scenarios/evaluateScenario.ts` | Engine validation + `runSimulation` for the current inputs |
| `comparison/records.ts` | `ScenarioRecord` (inputs + config + result) and pure transitions: edit draft, run candidate, restore, promote |
| `comparison/compareRuns.ts` | Altitude series, run endpoints, common recorded-sample differences (physical units only) |
| `results/runSummary.ts` | Per-sample and aggregate metrics computed from recorded samples |
| `results/format.ts`, `results/labels.ts` | Unit-aware formatting and engine/warning labels |
| `app/playback.ts` | Sample-accurate playback cursor (pure math + React hook) |
| `app/AltitudeChart.tsx`, `app/altitudeChartMath.ts` | Dependency-free SVG chart and its physical-to-view scale/tick math |
| `app/ComparisonPanel.tsx`, `app/ComparisonSummary.tsx` | Chart panel with series provenance, and the comparison metric table |
| `app/ReferencePresetPanel.tsx` | Cached JPL Horizons provenance, exact vector, query/source, and load-into-candidate action |
| `app/ModeTabs.tsx` | Reversible Solar System Overview / Earth Orbit Lab mode switch |
| `app/SolarSystemOverview.tsx` | Default reference screen: body selector, selected-body facts, camera reset, scale/source disclosures |
| `solarSystem/bodies.ts` | Display-only Sun + eight-planet registry, schematic positions, camera poses, and local texture metadata |
| `scene/SolarSystemViewport.tsx` | Static Overview canvas, procedural orbit guides, DOM labels, selection/focus camera, texture fallbacks, credit overlay |
| `scene/useLocalTexture.ts`, `scene/planetSurface.ts` | Shared local-texture loading/disposal and texture-or-fallback material state |
| `app/*.tsx` | Top bar (with record switcher), object browser, inspector, results, timeline, notices, status banners |
| `scene/displayScale.ts` | One-way km → scene-unit transform (display only) |
| `scene/SimulationViewport.tsx` and siblings | Canvas, textured central body with procedural fallback, deterministic star field, trajectory, marker, and display-only Orbit/Earth framing |
| `components/` | Presentation-only primitives (panel, chip, button, numeric field) |

The dependency direction of section 1 is enforced by construction: `src/simulation/` imports no React,
Three.js, or browser API; `src/comparison/` imports the engine and the scenario bridge but no React, so its
comparison math is unit-testable in the node environment; the viewport consumes `SimulationResult.samples` and
converts positions with a one-way display transform that is never read back into simulation state; the chart
uses physical kilometres and recorded timestamps, not scene units; `results/` derives its metrics through the
engine's own `derivedMetrics` utilities rather than re-deriving physics. UI-layer tests in `src/app/__tests__/`,
`src/scenarios/__tests__/`, `src/results/__tests__/`, `src/comparison/__tests__/`, and `src/scene/__tests__/`
cover the boundary; a lint rule forbidding UI imports inside `src/simulation` is still not in place.

### Planned, not present

`src/missions/`, `src/ai/`, `src/types/`, and `server/` do not exist yet. There is a cached reference-data
adapter and one fixture in `src/data/`, but no live Horizons request/refresh path, provider cache service, or
additional data source. No persistence layer, mission evaluator, general asset-loading pipeline, or AI service
exists. There is no charting dependency: the single comparison chart is hand-rendered SVG and opens in a
collapsible analysis drawer. The viewports load only the six local textures described in the public README;
they load no models, star panoramas, or remote assets. The star field is deterministic procedural geometry.

### Not yet decided in code

Whether the scenario manager owns mission templates and how runs are persisted across sessions are still open;
comparison records currently live in memory for the session only.

### Cached reference preset semantics

The reference preset is a provider-shaped cached response, not a live integration. The adapter validates the
target, center, frame, units, time scale, and a single geometric vector before constructing a preset. Loading it
into the candidate stores the exact vector in the candidate draft; the engine then receives that vector unchanged
as `initialState`. The record retains the provenance so the top-bar reference chip, inspector, comparison
summary, and model notice can label the run as a hypothetical two-body propagation rather than an ephemeris.

Editing altitude or speed detaches the exact vector, records the source preset as `derivedFrom`, and uses the
derived circular parameters. The original provider vector and source provenance remain attached to the scenario,
but they are no longer propagated. The UI surfaces that conversion explicitly, and the reference-derived run
remains in the candidate/baseline record until the user runs or replaces it. The preset carries a TDB epoch and ICRF frame label for provenance, but the model
does not implement time-scale conversion, epoch propagation, or a frame rotation; those approximations are
disclosed in the model notice. A malformed fixture produces an unavailable-reference message, not a synthetic
substitute.

### Solar System Overview semantics

The Overview is the default screen and a deliberately separate presentation surface. `src/solarSystem/bodies.ts`
owns a static registry of the Sun and eight planets: display radii, compressed orbit radii, fixed composition
angles, accent/fallback colours, optional local texture metadata, and camera poses. These are scene-composition
values, not physical radii, distances, orbital elements, or epochs. The module imports no simulation, scenario,
comparison, or result code, computes no dynamics, and has no clock or simulated time. Its positions are never
converted to physical units or written into the Lab.

`src/scene/SolarSystemViewport.tsx` renders that registry with procedural orbit guides, textured spheres, a
procedural Saturn ring, a deterministic star field, and DOM labels projected from the camera each frame. Body
selection and **Overview view** change camera framing and the details panel only. The four planetary textures are
loaded from local paths through `useLocalTexture`; a load failure falls back to the registry's procedural colour.
All source pages, credits, dimensions, and byte sizes stay in the registry and are surfaced by the disclosure and
the public README.

Mode switching is reversible. `App.tsx` keeps the comparison state outside both screens and creates the initial
Lab baseline only on the first switch to the Lab, so simply loading the app does not execute the engine. Returning
to the Overview does not clear the baseline, candidate, draft, selected body, playback cursor, or records;
switching to the Overview pauses playback so it does not advance while hidden. The mode switch also moves
focus to the destination heading or main lab region. The Overview itself has no playback, parameter, or run
controls.

Limitations are explicit in the UI: orbit guides indicate order only, sizes and spacing are compressed, positions
are illustrative rather than an ephemeris, and no planetary dynamics or N-body model exists. The Overview does not
represent moons, rings beyond Saturn's schematic ring, live data, weather, telemetry, or dates.
