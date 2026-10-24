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

The rendering layer may load curated third-party meshes and textures. Before any such asset is shipped, review its license and usage terms, record the attribution that license requires, and keep physical properties and scenario state independent from render geometry and display scale. Asset-load failures must degrade to a placeholder rather than alter or block the simulation state. The current build loads six local NASA textures (Earth surface and static clouds plus four planetary maps in the Overview) with procedural fallbacks, one local NASA GOES GLB with a marker fallback in the Earth Orbit Lab, and one local NASA VTAD 101955 Bennu GLB with a procedural faceted rocky fallback when Bennu is focused in the Solar System Overview. Each GLB path is a specific, lazily loaded reference/display loader; there is no general model catalogue or asset pipeline.


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

## 3. Active frontend stack

The application stack is firmly established: **React 19 + TypeScript + Vite**, with **Three.js (0.186)**, **React Three Fiber (9.8)**, and **Drei (10.7)** for 3D visualization, **Vitest (5.0)** for testing, and **oxlint** for static analysis. The simulation core is framework-independent pure TypeScript. No external charting library is used; the altitude comparison chart is a custom, zero-dependency hand-rendered SVG.

## 4. Repository structure

```text
src/
  simulation/      # Framework-independent physics core: units, constants, force model,
                   # integrator, validation, runner, derived metrics, tests
  scenarios/       # Editable inputs -> validated engine configuration (no physics here)
  missions/        # Framework-independent circular-orbit evaluator and thresholds
  data/            # Cached JPL Horizons fixture, parser, provenance, reference preset
  comparison/      # Immutable run records, candidate runs, altitude series, shared-sample differences
  results/         # Display metrics and formatting derived from recorded samples
  solarSystem/     # Display-only Solar System registry: bodies (Sun, 8 planets, Bennu), schematic layout, camera poses
  app/             # Workspace panels, playback timeline, comparison chart, mission UI, Overview screen
  scene/           # 3D viewports (display only, one-way km -> scene-unit transform), GOES & Bennu meshes
  components/      # Presentation-only UI primitives (Panel, Button, Chip)
  test/            # Shared test setup and DOM test utilities
public/assets/     # Locally served visual assets (NASA Earth/planetary textures, GOES & Bennu GLBs)
docs/              # Canonical technical documentation
```

## 5. Domain contracts

Active contracts enforce strict separation between simulation state, reference data, and UI presentation:

```ts
// From src/simulation/vector3.ts and src/simulation/types.ts:
export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type StateVector = {
  positionKm: Vec3;
  velocityKmPerS: Vec3;
};

export type SimulationConfig = {
  label?: string;
  centralBody: CentralBody;
  initialState: StateVector;
  timestepSeconds: number;
  durationSeconds: number;
  sampleIntervalSeconds?: number;
  impactRadiusKm?: number;
  maxSteps?: number;
};

export type SimulationSample = {
  timeSeconds: number;
  state: StateVector;
};

export type SimulationResult = {
  label?: string;
  model: SimulationModelId;
  integrator: IntegratorId;
  units: UnitSystem;
  frame: ReferenceFrame;
  centralBody: {
    id: string;
    name: string;
    gravitationalParameterKm3PerS2: number;
  };
  timestepSeconds: number;
  durationSeconds: number;
  sampleIntervalSeconds: number;
  completedDurationSeconds: number;
  status: SimulationStatus;
  stopReason?: SimulationWarningCode;
  warnings: SimulationWarning[];
  samples: SimulationSample[];
  diagnostics: {
    steps: number;
    accelerationEvaluations: number;
    initialSpecificOrbitalEnergyKm2PerS2: number;
    finalSpecificOrbitalEnergyKm2PerS2: number;
    maxRelativeEnergyDeviation: number;
  };
};

// From src/comparison/records.ts:
export type ScenarioRecord = {
  role: 'baseline' | 'candidate';
  inputs: ScenarioInputs;
  config: SimulationConfig;
  result: SimulationResult;
};

// From src/missions/circularOrbitMission.ts:
export type MissionCriterion = {
  id: 'coverage' | 'altitude-window' | 'clearance';
  label: string;
  status: 'pass' | 'fail' | 'not-evaluable';
  detail: string;
};

export type MissionEvaluation = {
  status: 'pass' | 'fail' | 'not-evaluable';
  reason: string;
  targetAltitudeKm: number;
  targetToleranceKm: number;
  minClearanceKm: number;
  targetRadiusKm: number | null;
  targetPeriodSeconds: number | null;
  targetCircularSpeedKmPerS: number | null;
  requiredDurationSeconds: number | null;
  evaluatedDurationSeconds: number | null;
  requestedDurationSeconds: number | null;
  recordedSampleCount: number;
  usableSampleCount: number;
  minAltitudeKm: number | null;
  maxAltitudeKm: number | null;
  altitudeSpanKm: number | null;
  runStatus: SimulationStatus | null;
  warningCount: number;
  warningCodes: SimulationWarningCode[];
  criteria: MissionCriterion[];
};
```

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

## 8. Implementation status in this repository (2026-10-24)

### Implemented

`src/simulation/` — the isolated physics core. It is framework-independent: it imports no React,
Three.js, or browser API, and it is verified by `src/simulation/__tests__/` (8 files, 72 tests).

The UI, data, comparison, scenario, result, scene, solar-system, and mission modules are verified by further
test files, including DOM interaction tests that drive the real component tree
(`src/app/__tests__/workspace.test.tsx`, `src/app/__tests__/comparisonView.test.tsx`,
`src/app/__tests__/referencePresetView.test.tsx`, `src/app/__tests__/overviewView.test.tsx`,
`src/app/__tests__/missionView.test.tsx`). The full suite is 29 files / 262 passing tests; the physics core
accounts for 8 files / 72 tests. The WebGL viewports are replaced by stubs in those tests because jsdom has no
WebGL context; the rendered scenes and the GOES and Bennu GLB load/fallback paths were verified separately in a
real browser.

`src/missions/` — the framework-independent mission evaluator. It imports the simulation's documented
constants and derived-metric helpers, accepts a target altitude and a `SimulationResult`, and returns a
structured PASS / FAIL / NOT EVALUABLE result. It imports no React, Three.js, browser API, or comparison
state. Evaluation reads recorded samples only; editable inputs are never treated as a result.

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
| `app/ModeTabs.tsx` | Three-surface switch: Solar System Overview / Earth Orbit Lab / Mission Designer |
| `app/MissionDesignerPanel.tsx` | Task-first target/initial-condition controls, Run Mission action, outcome, criteria, sample-derived metrics, disclosures |
| `missions/circularOrbitMission.ts` | Circular-speed/period formulas, target validation, recorded-sample evaluation, and NOT EVALUABLE rules |
| `app/SolarSystemOverview.tsx` | Default reference screen: body selector, selected-body physical facts & provenance, opt-in schematic motion strip, camera reset, scale/source disclosures |
| `solarSystem/bodies.ts` | Display-only Sun + eight-planet + 101955 Bennu registry, sourced physical reference facts (`SolarSystemPhysicalFacts`), schematic positions, camera poses, local texture metadata, and Bennu 3D model metadata (`BENNU_MODEL`) |
| `solarSystem/schematicMotion.ts` | Pure, period-proportional schematic motion helpers (`theta_i(days) = phaseRadians_i + 2*pi * elapsedDays / siderealOrbitPeriodDays_i`) and deterministic day stepping/clamping |
| `scene/SolarSystemViewport.tsx`, `scene/solarSystemLabels.ts` | Overview canvas, procedural orbit guides, deterministic 10-body screen-space collision-resolved DOM labels, selection/focus camera tracking schematic positions, texture/mesh fallbacks, credit overlay |
| `scene/bennuModel.ts`, `scene/BennuAsteroidModel.tsx` | Bennu asset metadata/association and lazy, focus-only GLB loading with procedural faceted rocky shape at wide system view and as a load failure fallback |
| `scene/useLocalTexture.ts`, `scene/planetSurface.ts` | Shared local-texture loading/disposal and texture-or-fallback material state |
| `scene/spacecraftModels.ts`, `scene/GoesSpacecraftModel.tsx` | GOES-16 asset metadata/provenance and lazy, render-only GLB loading with marker fallback |
| `app/*.tsx` | Top bar (with record switcher), object browser, inspector, results, timeline, notices, status banners |
| `scene/displayScale.ts` | One-way km → scene-unit transform (display only) |
| `scene/SimulationViewport.tsx` and siblings | Canvas, textured central body with procedural fallback, deterministic star field, trajectory, particle or render-only GOES mesh, and display-only Orbit/Earth framing |
| `components/` | Presentation-only primitives (panel, chip, button, numeric field) |

The dependency direction of section 1 is enforced by construction: `src/simulation/` imports no React,
Three.js, or browser API; `src/missions/` imports simulation constants/utilities but no React or scene code;
`src/comparison/` imports the engine and the scenario bridge but no React, so its comparison math is
unit-testable in the node environment; the viewport consumes `SimulationResult.samples` and converts positions
with a one-way display transform that is never read back into simulation state; the chart uses physical
kilometres and recorded timestamps, not scene units; `results/` derives its metrics through the engine's own
`derivedMetrics` utilities rather than re-deriving physics. UI-layer tests in `src/app/__tests__/`,
`src/scenarios/__tests__/`, `src/results/__tests__/`, `src/comparison/__tests__/`, `src/missions/__tests__/`,
and `src/scene/__tests__/` cover the boundary; a lint rule forbidding UI imports inside `src/simulation` is
still not in place.

### Planned, not present

`src/ai/`, `src/types/`, and `server/` do not exist yet. There is a cached reference-data adapter and one
fixture in `src/data/`, but no live Horizons request/refresh path, provider cache service, or additional data
source. No persistence layer, mission history, general asset-loading pipeline, model catalogue, or AI service
exists. There is no charting dependency: the single comparison chart is hand-rendered SVG and opens in a
collapsible analysis drawer. The viewports load six local textures and one local GOES GLB; they load no star
panoramas or remote assets. The star field is deterministic procedural geometry.

### Not yet decided in code

The mission evaluator currently lives in `src/missions/`; whether a future scenario manager owns mission
templates and how runs are persisted across sessions are still open. Comparison records and the mission target
currently live in memory for the session only.

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
owns a registry of the Sun and eight planets: display radii, compressed orbit radii, initial composition
angles, accent/fallback colours, optional local texture metadata, camera poses, and sourced physical reference
facts (`meanRadiusKm`, `semiMajorAxisAu`, `siderealOrbitPeriodYears`, `siderealOrbitPeriodDays`, `eccentricity`,
`inclinationDeg`, and source URLs; orbital fields are `null` for the central Sun). The display geometry (`orbitRadius`,
`displayRadius`, `phaseRadians`) remains strictly separated from the physical facts. `src/solarSystem/schematicMotion.ts`
derives period-proportional illustrative positions along each planet's compressed circular guide from elapsed
schematic Earth days (`theta_i(days) = phaseRadians_i + 2*PI * elapsedDays / siderealOrbitPeriodDays_i`), keeping
the Sun fixed at `[0, 0, 0]`. Neither module imports simulation, scenario, comparison, or result code, computes
planetary dynamics, or feeds positions into the Earth Orbit Lab.

`src/scene/SolarSystemViewport.tsx` renders that registry with procedural orbit guides, textured spheres, a
procedural Saturn ring, a deterministic star field, and DOM labels projected from the camera each frame. Body
selection, **Overview view**, and schematic motion update camera framing and the details panel only; when a body is
focused, the camera tracks its schematic displacement. The four planetary textures are
loaded from local paths through `useLocalTexture`; a load failure falls back to the registry's procedural colour.
All source pages, credits, dimensions, and byte sizes stay in the registry and are surfaced by the disclosure and
the public README.

Mode switching is reversible. `App.tsx` keeps the comparison state and the Overview's elapsed schematic days outside
all three surfaces and creates the initial baseline only on the first switch to the Lab or Mission Designer, so
simply loading the app does not execute the engine. Switching among the three surfaces does not clear the baseline,
candidate, draft, selected body, Overview elapsed schematic days, playback cursor, or records; every mode switch
pauses active playback (both Lab/Mission sample playback and Overview schematic motion) so nothing advances while
hidden, and no hidden WebGL canvas is kept mounted. The switch moves focus to the destination heading or main lab region.

Limitations are explicit in the UI: orbit guides indicate order only, sizes and spacing are compressed, positions
and schematic motion are illustrative rather than a dated ephemeris, and no planetary dynamics or N-body model exists.
The Overview does not represent moons, rings beyond Saturn's schematic ring, live data, weather, telemetry, or calendar dates.

### Mission evaluation semantics

The Mission Designer is a UI over the same comparison records. `src/missions/circularOrbitMission.ts` exports
one template and a pure evaluator. The target radius is `R_Earth + targetAltitudeKm`; the formula-derived target
circular speed is `sqrt(mu / r)` and the period is `2*PI*sqrt(r^3 / mu)`, using the documented constants. The
evaluator never reads the draft target/speed as a result.

A result is **PASS** only when the engine reports a completed run, the recorded samples cover at least one target
period, every recorded altitude is within ±20 km of the target, and every recorded altitude is at least 200 km
above the mean Earth radius. A completed run that violates the altitude or clearance criterion is **FAIL**.
Missing, empty, non-finite, malformed, stopped, truncated, or too-short results are **NOT EVALUABLE**, not a pass
or fail. The UI's Run Mission action extends the test window to at least two initial reference periods before
calling the existing engine; this is a run-window choice, not a new integrator or trajectory path. The metrics
panel reports target and ideal circular values, recorded min/max/span altitude, evaluation duration, usable
sample count, run status, and warnings. Altitude span is descriptive; it is not a separate hidden criterion.

### Render-only GOES mesh

The displayed GOES-16 reference or reference-derived record may carry a local NASA GOES GLB. The model is lazy
loaded only for that record, normalized in scene units for legibility, and drawn at the recorded sample. It is a
display asset: it is never read by `src/simulation/`, `src/missions/`, `src/results/`, or `src/comparison/`, and
it does not add mass, physical radius, attitude, thrust, fuel, or dynamics. A load error falls back to the normal
particle marker and the viewport states that the mesh was unavailable. The asset source, byte size, checksum,
credit, usage uncertainty, and render-only disclosure are recorded in `docs/ASSETS.md` and surfaced in
the viewport and model notice.
