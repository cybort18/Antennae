# Product Requirements Document (PRD) — Antennae / Space Sandbox

**Working Product Name:** Antennae (working title: *Space Sandbox*)  
**Repository:** [https://github.com/cybort18/Antennae](https://github.com/cybort18/Antennae)  
**Document Status:** Canonical Product Specification (Phase 4 / V3 Workspace baseline)  
**Last Verified:** 2026-10-24 (29 test files, 262 tests passing)

---

## 1. Executive Summary & Vision

Antennae is a browser-based educational orbital-physics sandbox and mission-design environment. It enables students, space enthusiasts, and mission designers to explore celestial mechanics through deterministic numerical computation, quantitative baseline-versus-candidate comparisons, and verifiable mission criteria.

### Core Product Thesis
**Explore → Modify → Simulate → Understand.**  
Static space visualizations often allow a user to observe pre-rendered animations without understanding the governing physics. Specialist mission tools introduce steep technical barriers. Antennae bridges this gap by providing an interactive loop where altering a supported physical input produces a deterministic numerical trajectory, visualizes the motion in a 3D canvas, compares the result against a baseline, and derives unambiguous success or failure metrics.

---

## 2. Problem Statement & Target Personas

### 2.1 Problem Statement
Space science education and outreach tools suffer from an artificial divide:
1. **Passive visualizers** show impressive graphics or pre-computed Keplerian ellipses, but do not let users change initial conditions or experience what happens when an orbit becomes unstable.
2. **Specialist mission software** requires deep orbital mechanics expertise, complex coordinate frame setups, and terminal-driven workflows inaccessible to learners.
3. **Black-box or generative demos** present animations or AI narratives without connecting them to verified numerical equations.

Antennae solves this by pairing an isolated, framework-independent two-body physics core with a minimalist 3D workspace and goal-driven mission evaluation.

### 2.2 Target Personas

| Persona | Primary Goal in Antennae | Key Needs |
|---|---|---|
| **Curious Learner** | Experiment with orbital speed and altitude; observe motion and shape changes. | Immediate visual feedback, simple controls, clear "Not to scale" cues, intuitive units. |
| **Student / Educator** | Demonstrate orbital mechanics principles (period, speed, circular velocity) in coursework. | Transparent formulas, repeatable deterministic runs, physical units (km, s, km/s), no fake physics. |
| **Space Enthusiast** | Inspect real NASA/JPL spacecraft reference states and realistic configurations. | Genuine data provenance (Horizons query, epoch, frame), realistic textures, honest approximations. |
| **Aspiring Mission Designer** | Solve structured orbit-insertion challenges against explicit constraints. | Explicit target tolerances, clearance constraints, PASS/FAIL criteria based on recorded samples. |
| **Hackathon Judge / Reviewer** | Verify scientific integrity, data provenance, code quality, and challenge fit in minutes. | Zero-setup browser app, reproducible runs, clear disclosures, verifiable automated tests. |

---

## 3. Product Surfaces & Main User Journeys

The application provides three distinct operational surfaces accessible via top-level mode navigation:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Workspace Mode Tabs                           │
│  [ Solar System (Overview) ]  [ Earth Orbit Lab ]  [ Mission Designer ] │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐
│  Solar System    │       │ Earth Orbit Lab  │        │ Mission Designer │
│  (Overview)      │       │ (Open Sandbox)   │        │ (Goal-Driven)    │
│                  │       │                  │        │                  │
│ • Static layout  │       │ • Two-body run   │        │ • Target altitude│
│ • Sun + 8 planets│       │ • Param editing  │        │ • Clearance rule │
│ • NASA textures  │       │ • Altitude chart │        │ • Coverage rule  │
│ • Reference view │       │ • Baseline vs    │        │ • Deterministic  │
│ • No dynamics    │       │   Candidate run  │        │   PASS/FAIL eval │
└──────────────────┘       └──────────────────┘        └──────────────────┘
```

### 3.1 Solar System Overview (Orientation & Reference Surface)
- **Role:** Default landing view that establishes cosmic scale and context before entering orbital simulation.
- **Scope & Limitations:** A schematic 3D visualization of the Sun, eight planets, and near-Earth asteroid **101955 Bennu** with sourced NASA/JPL physical reference facts and an opt-in, period-proportional schematic motion control. It is **not** a dated ephemeris, dynamic simulation, or N-body model. Sizes, distances, and orbit spacings are compressed for legibility, and Bennu's circular schematic guide is explicitly distinguished from its real eccentric, inclined Apollo orbit.
- **User Flow:**
  1. User lands on the Overview; inspects the Sun, eight planets, and asteroid 101955 Bennu (motion starts paused at `+0.0 Earth days`).
  2. Selects any body via clickable collision-resolved canvas labels or the body drawer list.
  3. Inspects physical reference facts (volumetric or derived mean radius, semi-major axis, sidereal orbital period in Earth days and Julian years, eccentricity, inclination, plus Bennu's rotation period and perihelion/aphelion distances) with official NASA/JPL provenance links and local NASA texture/mesh attribution.
  4. Focuses camera on the selected body (lazily loading the official NASA VTAD 3D GLB mesh when Bennu is focused, with a procedural rocky shape at system view or on load failure), steps/scrubs/plays illustrative schematic motion (0–3,650 Earth days at 10, 60, or 365 d/s), or resets to system view.
  5. Switches reversibly to Earth Orbit Lab or Mission Designer (automatically pausing schematic motion while preserving elapsed schematic days and in-memory simulation records).

### 3.2 Earth Orbit Lab (Open Physics Sandbox)
- **Role:** Interactive laboratory for two-body orbital mechanics around Earth.
- **Scope:** Massless test particle in Earth's point-mass gravitational field ($a = -\mu r / |r|^3$) integrated with a fixed-step kick-drift-kick leapfrog algorithm.
- **User Flow:**
  1. User enters Earth Orbit Lab (instantiates baseline circular orbit at 400 km altitude).
  2. Views textured Earth (NASA Blue Marble), test particle marker, and recorded orbit trail in 3D canvas.
  3. Opens the **Objects & reference data** drawer to inspect initial conditions or load the cached GOES-16 preset.
  4. Edits candidate initial altitude (200–50,000 km) or tangential speed in the inspector.
  5. Clicks **Run candidate** to execute the deterministic simulation.
  6. Opens the bottom analysis drawer to inspect the altitude-vs-time comparison chart and common-sample delta metrics.
  7. Replays recorded samples using the timeline controls (play, pause, step, scrub, 10x–1000x time multiplier).
  8. Optionally replaces the baseline with the candidate run via a two-step confirmation.

### 3.3 Mission Designer (Goal-Driven Challenge)
- **Role:** Structured engineering challenge evaluating candidate trajectories against explicit mission rules.
- **Template:** *Design a Stable Circular Earth Orbit*.
- **Scope:** Evaluates recorded simulation samples against target radius, period coverage, altitude window, and Earth clearance.
- **User Flow:**
  1. User selects Mission Designer mode (preserves existing baseline, candidate, and playback states).
  2. Reviews the primary objective card: target altitude (250–2,000 km, default 400 km), tolerance ($\pm 20$ km), and clearance ($\ge 200$ km).
  3. Adjusts target altitude or clicks **Use ideal circular start** helper to populate analytical velocity ($v = \sqrt{\mu/r}$).
  4. Clicks **Run Mission** (automatically sets test duration to cover at least one target period).
  5. Inspects the prominent outcome card: **PASS**, **FAIL**, or **NOT EVALUABLE** with a plain-language explanation.
  6. Inspects the three explicit criteria checkboxes with observed values:
     - *Period coverage:* recorded simulated duration $\ge$ target orbital period ($T = 2\pi\sqrt{r^3/\mu}$).
     - *Altitude tolerance:* all recorded samples remain within target $\pm 20$ km.
     - *Minimum clearance:* all recorded samples maintain $\ge 200$ km clearance above mean Earth radius.

### 3.4 Real-Data Exploration (Cached JPL Horizons Preset)
- **Role:** Grounding the sandbox in authentic space agency reference data.
- **Fixture:** Cached JPL Horizons Cartesian state vector for NOAA geostationary satellite GOES-16 (`-141866`) at epoch 2026-10-20 00:00 TDB.
- **User Flow:**
  1. User opens the Reference data section; reviews provider metadata, retrieval timestamp, TDB epoch, ICRF frame, and exact state vector.
  2. Clicks **Load preset into candidate**; exact position and velocity populate candidate initial conditions without executing the engine.
  3. Clicks **Run candidate** to propagate a hypothetical two-body trajectory from the exact NASA/JPL state.
  4. In the 3D scene, a locally served, render-only NASA GOES spacecraft GLB appears at the satellite position.
  5. Editing altitude or speed visibly converts the candidate into a circular approximation, retaining original vector provenance as `derivedFrom`.

---

## 4. Design Heritage & Reference Provenance

The conceptual origin and initial feature blueprint for this project is recorded in `Space_Sandbox_Project_Design_NASA_Space_Apps_2026.pdf` (version 1.0, dated 11 October 2026; 384,227 bytes, 14 pages; kept private and local in the repository root).

**Interpretation Caveats:**
- The design PDF represents an initial planning proposal, not proof of prior implementation.
- Architectural and scientific requirements were extracted and cross-checked against standard orbital mechanics equations. Layout diagrams in the PDF were conceptual; actual UI architecture has evolved to a cleaner V3 minimalist workspace.
- The PDF is owner-managed and must remain read-only and local; its full text must never be copied into public documentation.

---

## 5. Challenge Alignment

- **Target Candidate:** **NASA Space Apps Challenge 2026 — Space Mission Design Game (#13)**.
- **Alignment Caution:** This challenge mapping was identified in the project blueprint as the strongest fit, **not an official qualification or guaranteed ruling**. The live challenge brief, rules, and judging criteria must be re-verified by the team prior to final hackathon submission.
- **Demonstration Strategy:**
  - A generic space visualizer alone is insufficient for Challenge #13.
  - Antennae addresses the challenge by combining an open physics sandbox with a goal-driven Mission Designer featuring explicit mission objectives, user-controlled parameters, deterministic simulation, and transparent PASS/FAIL evaluation derived strictly from calculated samples.

---

## 6. Implementation Status vs. Blueprint Vision

| Dimension | Blueprint Vision | Current Working Code (2026-10-23) | Status |
|---|---|---|---|
| **Modes** | Sandbox + Mission Designer + AI Copilot | Solar System Overview + Earth Orbit Lab + Mission Designer | Implemented; AI Copilot deferred |
| **Physics Model** | Multi-level: Two-body → N-body → Thrust | Level 1: Point-mass Earth, massless test particle, kick-drift-kick leapfrog | Implemented & benchmarked; N-body/thrust not implemented |
| **Integrator** | Symplectic leapfrog or velocity Verlet | Fixed-step kick-drift-kick leapfrog (`src/simulation/integrators.ts`) | Implemented |
| **Units & Frame** | Explicit units, Earth-centered inertial frame | km, s, kg, km/s, km³/s²; EME2000-family axes, no attached epoch | Implemented |
| **NASA/JPL Data** | Live Horizons/SBDB API with cached fallback | 1 cached JPL Horizons fixture (GOES-16 vectors) with provenance | Cached preset implemented; live API deferred |
| **3D Rendering** | Three.js / React Three Fiber scene | R3F + Drei viewport, textured Earth, static clouds, star field, DOM labels | Implemented |
| **3D Assets** | Curated external models/textures with attribution | 6 local NASA textures (~3.50 MiB) + 1 local NASA GOES-R GLB (~6.14 MiB, render-only) + 1 local NASA VTAD Bennu GLB (~0.82 MiB, render-only on focus) | Implemented & credited; render-only separation |
| **Comparison** | Baseline vs. candidate scenario comparison | Immutable `ScenarioRecord` architecture, SVG altitude chart, common-sample delta metrics | Implemented (zero-dependency SVG) |
| **Mission Flow** | Goal-driven templates with calculated outcomes | Template: *Design a Stable Circular Earth Orbit* with PASS/FAIL/NOT EVALUABLE rules | Implemented & tested |
| **AI Copilot** | Context-grounded explainer for run results | Not implemented (`src/ai/` does not exist) | Deferred to Phase 5; strictly out of MVP |
| **Persistence** | Local JSON export/import → cloud sync | In-memory session state only | Planned/deferred |

---

## 7. Milestone Roadmap

```text
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 3.5 ──► Phase 3.6 ──► Phase 4 ──► Phase 5 ──► Phase 6
Scope Lock  Interaction Physics     JPL Data    Visual Found. Solar System Mission Flow  AI Copilot  Demo Polish
[DONE]      [DONE]      [DONE]      [DONE]      [DONE]        [DONE]       [DONE]        [DEFERRED]  [NEXT]
```

- **Phase 0: Scope Lock (Done)** — Defined units, two-body model, initial Earth-orbit scenario, and explicit non-goals.
- **Phase 1: Visual & Interaction Skeleton (Done)** — 3D scene, object browser, inspector, playback controls, loading/stopped states.
- **Phase 2: Physics Core (Done)** — Isolated, framework-independent two-body engine with kick-drift-kick leapfrog, input validation, stop conditions, and benchmark suite (72 physics unit tests).
- **Phase 3: NASA/JPL Data & Presets (Done for cached preset)** — JPL Horizons parser, GOES-16 fixture, validated provenance metadata, exact-run and circular-approximation workflows. Live refresh deferred.
- **Phase 3.5: Visual Foundation (Done)** — Full-bleed canvas workspace, local NASA Blue Marble surface and cloud textures, procedural fallbacks, collapsible analysis drawer.
- **Phase 3.6: Solar System Overview (Done)** — Default schematic reference view of Sun + eight planets, four local NASA 3D Resources planetary maps, projected DOM labels, camera focus/reset, reversible mode switching.
- **Phase 4: Mission Flow & Comparison (Done for Circular Orbit)** — Immutable `ScenarioRecord` state, SVG altitude comparison chart, common recorded-sample delta metrics, *Design a Stable Circular Earth Orbit* mission template with deterministic PASS/FAIL/NOT EVALUABLE evaluation, render-only NASA GOES-R GLB.
- **Phase 5: AI Science Copilot (Deferred / Not Implemented)** — Structured context builder, explanation of computed results without hallucination. Requires live backend/proxy for secret isolation. Strictly deferred.
- **Phase 6: Demo & Submission Polish (Next Focus)** — Reviewer walkthrough rehearsal, judging criteria checklist, cross-browser validation.

---

## 8. Must-Have Acceptance Criteria (MVP Status)

| ID | Capability | Acceptance Criteria | Current Status |
|---|---|---|---|
| **MVP-01** | 3D Scene | User can view/select target body and spacecraft; camera controls do not block actions; responsive viewports. | **Met** (Overview Sun + 8 planets + 101955 Bennu with focus-loaded NASA VTAD mesh, Lab Earth + orbit + particle + render-only GOES mesh; procedural fallbacks). |
| **MVP-02** | Scenario Editor | Documented parameters editable; invalid values rejected with clear messages; reference preset loading. | **Met** (Altitude, speed, revolutions editable with range guardrails; cached preset loaded exactly or as circular approximation). |
| **MVP-03** | Physics Simulation | Supported scenario runs from defined initial conditions and returns reproducible outputs for identical inputs. | **Met** (Deterministic kick-drift-kick leapfrog core, bounded energy error, benchmarked tolerances). |
| **MVP-04** | Playback | Play, pause, step, reset, scrub, and time scale reflect real recorded simulation state. | **Met** (Sample-quantized timeline cursor; never interpolates or fabricates states). |
| **MVP-05** | Results & Comparison | Recorded trajectory plus calculated metrics; baseline and candidate runs compared on a shared chart. | **Met** (Immutable records, hand-rendered SVG altitude chart, common-sample delta table). |
| **MVP-06** | Mission Objective | Goal-driven template declares target/constraints and evaluates outcome strictly from computed samples. | **Met** (*Design a Stable Circular Earth Orbit* template; PASS/FAIL/NOT EVALUABLE criteria). |
| **MVP-07** | Provenance | Source-derived presets record provider, target ID, retrieval timestamp, epoch, frame, center, and units. | **Met** (GOES-16 JPL Horizons fixture with complete metadata displayed in UI and disclosures). |
| **MVP-08** | AI Explanation | AI assistant explains computed results, calls out assumptions, and never fabricates simulation outputs. | **Deferred** (No AI code in current build; `src/ai/` does not exist). |
| **MVP-09** | Resilience | Bundled cached inputs and procedural fallbacks support the demo when external networks are unavailable. | **Met** (Cached Horizons fixture, local NASA textures, procedural Earth/planet fallbacks, marker fallback for GLB). |
| **MVP-10** | Reproducible Demo | Full user journey works reliably from a clean app state and is verified by automated tests. | **Met** (29 test files / 262 tests pass; production build succeeds with exit code 0). |

---

## 9. Explicit Non-Goals for Hackathon MVP

Unless explicitly approved in a subsequent design decision, Antennae will **not** implement or claim:
1. **Unrestricted N-body simulations** with arbitrary bodies and adaptive time steps.
2. **CAD engineering fidelity:** No structural stress, thermal modeling, aerodynamic drag, or internal spacecraft bus systems.
3. **Operational flight safety or real-time navigation:** The software is an educational simulator, not flight software, a collision-risk authority, or an impact predictor.
4. **AI-generated numbers:** The LLM will never calculate or guess trajectories, orbital parameters, or mission scores.
5. **Multi-user accounts or cloud sync:** All comparison records and mission runs live in browser session memory for zero-setup accessibility.

---

## 10. Verification & Reproduction Story

A hackathon judge or first-time user can reproduce the complete product flow in under three minutes from a fresh launch:
1. **Landing:** Lands on the Solar System Overview; observes the schematic layout of Sun and planets with projected labels; selects Jupiter to inspect reference facts and NASA 3D Resources attribution.
2. **Sandbox:** Clicks **Earth Orbit Lab** tab; observes baseline low Earth orbit (400 km); edits candidate initial speed by +10%; clicks **Run candidate**; clicks **Show chart** to see candidate altitude oscillate in an eccentric orbit above the baseline.
3. **Mission Design:** Clicks **Mission Designer** tab; reviews the circular orbit challenge; clicks **Use ideal circular start** to set theoretical velocity; clicks **Run Mission**; verifies unambiguous **PASS** outcome with green checkboxes for coverage, altitude window, and clearance.
4. **NASA Preset:** Opens the left drawer; loads the cached GOES-16 JPL Horizons preset; clicks **Run candidate**; observes the geostationary orbit with the render-only NASA GOES spacecraft model displayed in the scene.
