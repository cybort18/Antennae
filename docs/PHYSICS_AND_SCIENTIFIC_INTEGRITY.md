# Physics & Scientific Integrity Contract

This document is a mandatory reference for every change that affects simulation values, orbital states, mission scores, or scientific explanations.

**Implementation status (2026-10-21):** section 2 describes the two-body core and cached reference
state that actually exist in `src/simulation/` and `src/data/` together with its measured test evidence.
The remaining sections are contracts that apply to current and future work; they are not claims that
those capabilities exist.

## 1. Source-of-truth rule

- The physics engine (or a specifically named and documented validated computational service) produces numerical simulation results.
- The scene renderer visualizes those results; it does not decide them.
- The AI Science Copilot explains structured computed outputs and can suggest follow-up experiments. It must not invent numerical results, fill missing metrics, or disguise interpretation as computation.
- NASA/JPL data is a reference input with provenance, not proof that a hypothetical user-modified simulation is a NASA forecast.

## 2. Implemented model in this repository (Milestone 1)

**Status: implemented and unit-tested.** Source of truth is the code: `src/simulation/`. Everything
below describes what the code does today, with the evidence that supports it.

### 2.1 Equation and force model

```text
a(r) = -mu * r / |r|^3          [km/s^2]
```

- One massless test particle in the point-mass gravity field of one fixed central body (Earth in the
  current preset). The particle's own mass does not enter the equations.
- **Included:** central point-mass gravity only.
- **Not included:** oblateness (J2 and higher), third bodies (Moon, Sun), atmospheric drag, solar
  radiation pressure, relativity, thrust, propellant consumption, collisions, fragmentation,
  shape-dependent gravity.

### 2.2 Units, frame, and epoch (as implemented)

| Quantity | Unit |
|---|---|
| Distance, position, radius | km |
| Time, timestep, duration | s |
| Mass | kg |
| Velocity | km/s |
| Acceleration | km/s^2 |
| Gravitational parameter GM | km^3/s^2 |

- Earth GM = 398600.4418 km^3/s^2 (standard geodetic value), recorded in `src/simulation/constants.ts`.
  It was **not** re-fetched or independently verified against a live source in this milestone.
- Frame: right-handed, Earth-centered inertial axes in the EME2000-family orientation (+x reference
  equinox direction, +z north rotation axis, +y completing the set). Motion with velocity along +y at
  position +x is prograde about +z.
- **No epoch and no time scale are attached to states.** Simulation time starts at t = 0 and advances
  by the configured timestep. This is valid only because the implemented forces are time-independent;
  it means states cannot be compared to real ephemerides without an explicit transformation.
- The frame is convention-aligned, not rigorously realized: no precession, nutation, Earth-orientation
  parameters, or time-scale conversion exists in this code.

### 2.3 Integrator and timing contract

- **Method:** fixed-step kick-drift-kick leapfrog (velocity Verlet), implemented in
  `src/simulation/integrators.ts`. Chosen because the system is a separable Hamiltonian: the method is
  symplectic, second order in the timestep, needs one new acceleration evaluation per step, and keeps
  the energy error bounded instead of drifting secularly at fixed step size.
- **Honest limits:** it is not exactly energy-conserving (energy oscillates within a bounded envelope),
  phase error accumulates, there is no adaptive stepping and no event detection beyond the radius
  checks below, and a step that is large relative to the local orbital period produces visibly wrong
  motion.
- **Timing contract:** `durationSeconds` and `sampleIntervalSeconds` must be integer multiples of
  `timestepSeconds` (1e-9 relative tolerance). Partial final steps are rejected rather than silently
  mixed into a result.
- **Determinism:** the runner is a pure function of its configuration (no randomness, clock, or I/O),
  and results contain no timestamps.

### 2.4 Validation and stop conditions (as implemented)

| Condition | Behavior |
|---|---|
| Non-finite numbers, non-positive/NaN GM, zero or negative timestep or duration, non-divisible duration/sampling, step count above the safety bound, radius or speed outside the supported numeric range, singular or sub-floor separation, impact radius inside the initial radius | `SimulationInputError` with one issue per field; no samples returned |
| Timestep larger than 1/50 of the initial local orbital period | `COARSE_TIMESTEP_ADVISORY` warning; run continues, flagged as potentially inaccurate |
| Radius at or below the configured impact radius | Run stops with `IMPACT_RADIUS_REACHED`; the out-of-limit state is not emitted as a result, the crossing is reported in the warning |
| Radius below the numeric floor (1e-3 km) | Run stops with `UNSAFE_SEPARATION` |
| Non-finite state or acceleration | Run stops with `NON_FINITE_STATE`; the invalid state is not recorded as a sample |
| Relative specific-orbital-energy deviation above 10% | Run stops with `ENERGY_DEVIATION_UNSTABLE`. This is sound only because energy is exactly conserved by this model's continuous dynamics; it must be redesigned if thrust or time-dependent forces are added |

### 2.5 Measured numerical behavior (evidence)

Benchmark: circular orbit at 6771 km radius (400 km altitude), dt = 10 s, 16,640 s (~3 orbits),
sampled every step, as asserted by `src/simulation/__tests__/circularOrbit.test.ts`.

| Quantity | Measured | Test tolerance |
|---|---|---|
| Max deviation from the initial radius | 0.4347 km (~6.4e-5 relative) | < 1 km |
| Max relative specific-orbital-energy deviation | 4.121e-9 | < 1e-7 |
| Max relative specific-angular-momentum deviation | 2.521e-15 (rounding only) | < 1e-12 |
| Max orbital eccentricity reached | 6.42e-5 | < 1e-4 |
| Period error against `T = 2*pi*sqrt(r^3/mu)` | 4.28e-5 relative | < 0.5% |

Timestep sensitivity over one orbit (5520 s), measured radial-oscillation reduction per halving of
the step: 4.00x at dt = 60, 30, 15, and 7.5 s — the expected quadratic behavior for this second-order
method. Sampled energy deviation also decreased in this case (about 16x per halving), which is
case-specific and not asserted as a general law.

### 2.6 Limitations to disclose wherever this model's output is shown

- It is a simplified educational model: no ephemeris accuracy, no real mission planning validity.
- The default preset is a synthetic idealization, not a NASA/JPL state, and carries no epoch. The opt-in
  GOES-16 preset starts from a cached JPL Horizons state vector; its simulated trajectory is still a
  hypothetical two-body propagation, and the provider epoch is provenance metadata rather than a model
  input.
- The energy-based instability stop is valid only for the current conservative force model.
- Recorded constants still require provenance verification against live sources before being presented
  as sourced data.
- Nothing here is a flight-safety, navigation, or impact-prediction capability.
- Displayed geometry is not to scale (marker size and line widths are exaggerated), and playback shows
  recorded samples only — neither affects the physics.

### 2.7 Cached JPL Horizons reference state (Phase 3)

**Status: implemented, with explicit provenance and integrity limits.**

- The one cached preset is a JPL Horizons VECTORS response for GOES-16 (target `-141866`). The fixture records
  a geometric Cartesian state about the Earth body center (`399`), in ICRF, in km and km/s, at
  2026-10-20 00:00:00 TDB. The retrieval time, exact query, API signature version, and source URL are stored
  with the preset. The cached response is parsed and validated; there is no live Horizons request at runtime.
- The parser rejects malformed tables, non-finite components, multiple states, unsupported frames, units,
  centers, time scales, and non-geometric output. A rejected fixture produces an unavailable-reference state,
  not a fallback to another target or a synthetic substitute.
- When loaded, the **exact** cached vector is used as the engine's `initialState`. The resulting trajectory is a
  hypothetical two-body propagation. It is **not** the satellite's real ephemeris and is not presented as one.
- The TDB epoch and ICRF frame are provenance labels. The model does not implement epoch propagation, time-scale
  conversion, precession/nutation, or a frame rotation; ICRF axes are used directly as the model's
  Earth-centered inertial axes, and the state instant is treated as t = 0. These approximations are disclosed
  in the workspace.
- Editing altitude or speed detaches the exact state and produces a circular approximation from the derived radius
  and speed. The source preset and its original vector remain attached as provenance (`derivedFrom`), but they are
  not propagated. The UI labels the conversion, and records remain immutable until an explicit run.
- The cached state is public NASA/JPL data. Attribution and the query are retained with the preset; the cache
  is not treated as a live forecast or a continuously updated service.

## 3. Declare model fidelity

Implement and label a model according to its actual equations and included forces. Recommended stages:

1. **Level 1 / MVP:** two-body/Keplerian or numerically integrated point-mass gravity around a dominant body, chosen to support one small, well-understood scenario.
2. **Level 2 / expansion:** N-body point-mass gravity for a controlled object count and safe timestep bounds.
3. **Level 3 / mission subset:** simplified thrust and propellant consumption, only as needed for an explicit mission trade-off.
4. Higher fidelity, richer perturbations, SPICE-backed mission geometry, and operational-grade models are post-MVP unless specifically scoped and validated.

Do not enable N-body, thrust, fuel, collision, atmospheric, or other outcomes in the UI unless the corresponding physics is actually implemented and tested.

## 4. Units and coordinate frames

Pick and document one internal unit convention and convert at boundaries. A candidate is km, seconds, kg, and km/s; if meters are chosen instead, update constants and all contracts consistently.

Every imported or persisted state should identify as applicable:

- Length, time, mass, velocity, and acceleration units.
- Epoch/time standard.
- Reference center/central body.
- Coordinate frame.
- Data provider, target identifier, retrieval time and query/settings where available.
- Model version, force assumptions, integration method, and timestep for each run.

Never combine states from different centers, frames, or epochs without explicit, tested transformations. Avoid silent conversion. Do not assume the epoch or frame from a target name alone.

## 5. Numerical model behavior

- Use dimensionally consistent constants and equations.
- Select integrators based on the equations and intended accuracy, not convenience alone. Leapfrog/velocity-Verlet may suit some conservative gravitational systems; make and document the actual choice.
- Timestep and integration settings affect numerical accuracy. A time-acceleration control advances simulated time more quickly; it does not improve accuracy or change physical constants.
- Apply safe bounds to timestep and state inputs. Handle close approaches/singular separations, overflow, NaN/Infinity, and unstable integration explicitly.
- Detect or conservatively check events that a large timestep might skip.
- Repeating the same run with the same inputs and configuration should produce reproducible results unless a deliberately stochastic model with an explicit seed is introduced.

## 6. Derived values and mission checks

All reported values must be calculated from available state/model data. Every metric needs a definition, units, and any applicable preconditions. Do not show fuel remaining unless propellant consumption is modeled. Do not call an orbit “stable” from a single attractive-looking screenshot. Do not evaluate “reached target” by visual proximity alone; define target tolerance and compare computed states in compatible frames/units.

Mission evaluation should return more than a decorative badge. Prefer structured results such as:

- overall status: passed, failed, inconclusive, invalid;
- each criterion's definition and observed value;
- threshold and units;
- relevant run ID/scenario version;
- reason the criterion could not be evaluated;
- caveats from the selected model.

## 7. Visual science honesty

- Keep physical radius/mass/position separate from display size/position transformations.
- Clearly disclose if object sizes or distances are not to scale.
- Identify user-edited/reference-derived values as hypothetical after modification.
- A visually realistic scene does not validate the numerical engine.

**As built (Milestone 2, 2026-10-19).** The viewport converts physical positions with one uniform display
factor (1 scene unit = 1,000 km) and never feeds scene units back into simulation state. The central body is
drawn with its documented mean radius, so body-versus-orbit proportion is preserved; marker size and line
widths are exaggerated for visibility, and the viewport carries a visible **NOT TO SCALE** badge plus a
sentence naming exactly what is exaggerated. Playback is sample-quantized: the marker is drawn at recorded
sample positions only and the trajectory connects recorded samples in order, so no interpolated or
extrapolated state is ever presented as simulation output. A stopped run shows the engine's own warning text
verbatim, and the playback cursor cannot advance past the last recorded sample (for geometric-limit stops the
offending state is not recorded, so the playable timeline ends earlier than `completedDurationSeconds`; the UI
states both numbers). Every displayed value is derived from recorded samples or reported by the engine's
diagnostics, and the preset is labelled as a synthetic idealization rather than NASA/JPL data.

**Visual foundation (Phase 3.5, 2026-10-20).** The Earth surface and cloud images are static, locally hosted
NASA Blue Marble display assets. They do not represent current weather, define an atmosphere, establish
rotation, or supply any physical parameter; Earth remains a smooth sphere at the documented mean radius.
The atmosphere shell, marker halo, deterministic procedural star field, and Orbit/Earth camera framing are
presentation only. Camera framing and texture orientation never feed back into sampled coordinates, units,
or records. If a texture fails to load, the scene falls back to the procedural Earth and omits the cloud
shell without changing simulation state. Chart tick precision now follows the tick step so a near-flat
low-orbit axis cannot print the same rounded label repeatedly; the underlying recorded series and physical
units are unchanged.

**Solar System Overview (Phase 3.6, 2026-10-21).** The default Overview is a static reference visualization,
not a simulation. Its body radii, orbit spacings, and fixed phase angles are display-composition values in
scene units; they are not physical radii, semi-major axes, orbital elements, epochs, or current positions.
The screen computes no gravity, no orbits, and no time evolution, and it has no simulated clock. Its data
module imports nothing from `src/simulation/` or `src/comparison/`, and no Overview value is written into
the Earth Orbit Lab state. Orbit guides indicate order only. The four local planetary textures are display
assets with the same status as the Earth images: pixels and appearance do not define mass, radius, rotation,
atmosphere, or any physical parameter. Venus uses a radar-derived surface map rather than natural colour,
and Neptune uses an explicitly illustrative texture; the UI labels both. Loading the app on the Overview
does not execute the two-body engine; the Lab baseline is created only on the first switch to the Lab.

**Comparison honesty (Milestone 3, 2026-10-19).** Baseline and candidate are separate run records, each
bundling the parameters, engine configuration, and engine result of one run, so a displayed comparison cannot
mix configurations. Editing parameters is not a result: the engine is called only on an explicit **Run
candidate**, and a rejected run keeps both records unchanged and reports the engine's messages. The chart plots
altitude above the mean Earth radius (physical kilometres) against each run's recorded simulated timestamps on
one shared time axis; it draws exactly the recorded samples, connects them in time order, and neither resamples
nor extends a series, so a stopped run ends at its last recorded sample and an unequal-duration comparison is
shown as it is. Differences (altitude, radius, speed, specific orbital energy) are reported only at the latest
simulated time recorded by *both* runs, matched on exact sample timestamps quantized to microseconds; when the
runs share no timestamp the difference is reported as unavailable rather than interpolated. Every final time is
labelled "final recorded" and qualified with the requested duration when the engine stopped early, so a stopped
run is never presented as complete. An altered orbit is described as a hypothetical comparison against a
simplified two-body model, not as a feasible operational mission trajectory.

## 8. Minimum validation suite

Add tests as the physics model grows. At minimum for a two-body MVP:

1. **Units/constants sanity:** known physical constants and preset values are within expected ranges after conversion.
2. **Circular-orbit qualitative test:** a valid ideal two-body circular-orbit setup remains approximately circular within a defined interval/tolerance.
3. **Numerical drift:** monitor energy/angular momentum only where the model/integrator makes those checks meaningful; define accepted tolerances.
4. **Timestep convergence:** reducing timestep changes the benchmark output by a decreasing amount within the tested range.
5. **Reference-state cross-check:** where meaningful, compare to an appropriate reference state at matching epoch/frame; do not claim exact agreement from a simplified force model.
6. **Invalid input:** reject zero/negative mass where disallowed, malformed vectors, non-finite values, unsafe separations, impossible bounds, and malformed external response data.
7. **Determinism:** same valid inputs/configuration give reproducible results.
8. **Mission evaluator:** explicit pass/fail boundary cases, unavailable metrics, and invalid/unstable run behavior.

Tests need numerical tolerances and explanation. Avoid tests that merely assert the output is a number or that a page renders.

The cached reference parser is covered separately in `src/data/__tests__/`: it checks exact state preservation,
source/format rejection, frame/center/unit/time-scale rejection, and malformed-table failure. The UI test checks
that loading the preset does not run the engine and that a run uses the exact cached vector.

## 9. AI guardrails

The AI context builder should pass structured data including scenario/version, model/version, configuration, initial conditions, units/frame/epoch, computed metrics/events, comparison data, warnings, numerical stability flags, and limitations.

System behavior must require the assistant to:

- use only supplied outputs for quantitative claims;
- identify interpretation vs model output;
- state when a requested quantity is missing and request computation rather than fabricate it;
- acknowledge limitations of the selected force model;
- refuse to describe a hypothetical educational run as an official NASA prediction or flight-safe result;
- say the result is unreliable if the engine flags instability or invalid data.

Never pass secret API credentials to browser-side code or version control.
