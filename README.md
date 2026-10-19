# Antennae — Space Sandbox

Antennae is a browser-based educational space-physics sandbox. It simulates a massless test particle
orbiting Earth under simplified two-body point-mass gravity, draws the trajectory the engine actually
recorded in a 3D workspace, replays those samples as a timeline, and compares a baseline run with a
modified candidate run through a computed altitude-versus-time chart.

It is a learning and demonstration tool. It is **not** flight software, a navigation tool, or an
impact-prediction service.

## What works today

- **Deterministic two-body physics core** (`src/simulation/`), framework-independent TypeScript: point-mass
  gravity, fixed-step kick-drift-kick leapfrog integration, input validation, stop conditions, warnings, and
  byte-identical output for identical input.
- **3D workspace** (`src/app/`, `src/scene/`): viewport with a procedurally drawn Earth, the recorded
  trajectory, and the particle at the selected sample; object browser; inspector for supported initial
  conditions; results panel; model-and-limitations notice; and a clearly labelled **NOT TO SCALE** display.
- **Sample-quantized playback**: run, pause, reset, single-sample stepping, scrubbing, and 10x–1000x time
  scales move a cursor through recorded samples only. Nothing interpolated is presented as simulation output.
- **Baseline vs candidate comparison** (`src/comparison/`): each run is an immutable record of parameters,
  configuration, and engine result. Editing changes candidate *parameters*; the engine runs only when you
  select **Run candidate**. You can restore the baseline parameters, replace the baseline with a confirmed
  two-step action, and read an altitude-versus-simulated-time chart plus differences at the latest simulated
  time recorded by **both** runs.
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

The starting preset is an explicit synthetic idealisation, **not** NASA/JPL observational data.

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

At the time of this initial commit, `npm test` reports 182 passing tests in 17 files and `npm run
typecheck`, `npm run lint`, and `npm run build` exit 0. Re-run the commands rather than trusting those
numbers; the automated tests cover the physics core, the scenario bridge, result summaries, the comparison
math, and the workspace interaction flows.

## Project structure

```text
src/
  simulation/   # Framework-independent physics core: units, constants, force model,
                # integrator, validation, runner, derived metrics, tests
  scenarios/    # Editable inputs -> validated engine configuration (no physics here)
  comparison/   # Run records, candidate runs, altitude series, shared-sample differences
  results/      # Display metrics and formatting derived from recorded samples
  app/          # Workspace panels, playback, comparison chart, layout styles
  scene/        # 3D viewport (display only, one-way km -> scene-unit transform)
  components/   # Presentation-only UI primitives
  test/         # Shared test setup
public/         # Static assets served as-is (favicon)
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

- Live or cached NASA/JPL data sources and provenance display (the current preset is synthetic).
- Mission designer: templates, target conditions, and pass/fail evaluation from computed values.
- An AI explanation layer; the simulation works without one and no results are generated by a model.
- 3D models, textures, or any asset pipeline; the scene is procedural geometry only.
- Persistence, accounts, sharing, and deployment configuration.
- Additional force models (N-body, thrust, drag) and any multi-body or spacecraft dynamics.

## Verification

The workspace was exercised end-to-end in a real browser (production build) as well as in the automated
suite: loading the default scenario, editing parameters, running a candidate, restoring baseline parameters,
promoting a candidate to baseline, rejecting invalid input, and running a candidate that stops at the impact
radius.

## License

No `LICENSE` file is included in this publication, so no license is granted by default.
