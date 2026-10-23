# Antennae / Space Sandbox — Agent Instructions

These are the repository-level operating instructions for all human developers and AI coding agents. Treat this document as the primary operating contract. Consult the task-based documentation routing table below to identify the canonical reference for specific tasks.

---

## 1. Product Truth & Project Identity

Antennae (working title: *Space Sandbox*) is a browser-based educational orbital-physics sandbox and mission-design environment. Its active surfaces are:
1. **Solar System Overview:** A static, schematic reference visualization of the Sun and eight planets; not an ephemeris or dynamic simulation.
2. **Earth Orbit Lab:** An open sandbox simulating a massless test particle orbiting a fixed Earth central body under deterministic two-body Newtonian gravity ($a = -\mu r / |r|^3$), with immutable baseline/candidate run records, sample-quantized timeline playback, an SVG altitude-vs-time comparison chart, and one cached JPL Horizons reference preset (GOES-16).
3. **Mission Designer:** A goal-driven challenge surface featuring one deterministic template (*Design a Stable Circular Earth Orbit*). Its PASS / FAIL / NOT EVALUABLE outcome is derived strictly from recorded simulation samples, never from inputs, visual proximity, or AI judgments.

**Core Invariant:** The physics engine is the numerical source of truth. NASA/JPL data provides reference inputs with provenance. Visual assets are display-only. AI explanation capabilities remain deferred until core physics and UX are mature.

---

## 2. Task-Based Documentation Routing

Before modifying or designing within a specific subsystem, read the corresponding canonical reference document:

| Task Type | Primary Reference | Purpose & Scope |
|---|---|---|
| **Product Scope & Roadmap** | [`PRD.md`](PRD.md) | Product thesis, user personas, journeys, MVP-01 to MVP-10 acceptance criteria, non-goals. |
| **UX / UI & Layout** | [`DESIGN.md`](DESIGN.md) | V3 minimalist canvas-first workspace, progressive disclosures, color tokens, accessibility, visual QA. |
| **Public Intro & Setup** | [`README.md`](README.md) | Human-facing quickstart, verified npm commands, feature limits, and public asset credits. |
| **Architecture & Modules** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layered dependency direction, module boundaries (`src/simulation`, `src/missions`, etc.), failure isolation. |
| **Physics & Math** | [`docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md`](docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md) | Formulas, geodetic constants, units/frames, leapfrog integrator contract, stop conditions, benchmark tolerances. |
| **NASA/JPL Data** | [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) | JPL Horizons query, cached fixture contracts, data ingestion, provenance schemas, outage policies. |
| **3D Assets & Credits** | [`docs/ASSETS.md`](docs/ASSETS.md) | Shipped models/textures, loader pipelines, attribution register, checksums, procedural fallbacks. |
| **Decisions & Rationale** | [`docs/DECISIONS.md`](docs/DECISIONS.md) | Append-only architectural decision log, historical trade-offs, rejected alternatives, open questions. |

*Reference Blueprint Note:* The owner-managed design PDF `Space_Sandbox_Project_Design_NASA_Space_Apps_2026.pdf` (v1.0, 11 Oct 2026) is a private, read-only conceptual blueprint kept in the repository root. It informs project goals but does not prove prior implementation. Do not edit, move, copy into public docs, or publish its raw text.

---

## 3. Non-Negotiable Engineering Rules

1. **Physics Output is Computed, Not Narrated:**  
   Numerical results originate solely from the validated physics engine (`src/simulation/`). Rendering layers and AI models must never invent, interpolate, or extrapolate numerical values.
2. **Rendering is Not the Physics Engine:**  
   Three.js and React Three Fiber render scene geometry and trajectories using a one-way display transform (`1 scene unit = 1,000 km` in Earth Orbit Lab). Visual geometry must never alter or feed back into physical simulation state.
3. **Carry Scientific Context with Data:**  
   Always maintain units (km, s, kg, km/s, km³/s²), coordinate frames (Earth-centered inertial, EME2000-family axes), central body, integrator, timestep, and force assumptions.
4. **Separate Reference Data from Hypothetical Edits:**  
   Loading a NASA/JPL preset uses the exact cached state. Editing altitude or speed converts the scenario into a circular approximation, preserving the original vector as provenance (`derivedFrom`) while marking the new run as hypothetical.
5. **Do Not Overstate Fidelity:**  
   Never describe Antennae's simplified educational models as "NASA-grade," flight-certified, navigation software, or verified impact predictors.
6. **No Invented Unknowns:**  
   Unavailable or unrepresented metrics must be displayed explicitly as unavailable; never fabricate placeholder values.
7. **Units and Validation are Mandatory:**  
   Validate numeric inputs at external boundaries. Never mix metric and imperial units or silently blend mismatched coordinate frames.
8. **Prefer a Complete Vertical Slice:**  
   Keep verified end-to-end user journeys working ahead of broad, unverified scaffolding.
9. **Security & Secrets:**  
   Never expose API secrets or private tokens in browser code. Never commit `.env` files.
10. **Respect User Work & Git Worktrees:**  
    Never discard user changes, overwrite dirty working trees, force-push, rewrite history, or commit/push unless explicitly requested in the active task.
11. **Review Third-Party Assets:**  
    Verify license terms, redistribution permissions, and exact attribution for every external asset. Maintain the register in `docs/ASSETS.md`.
12. **Keep Geometry Separate from Science:**  
    3D meshes (such as the GOES-R GLB) and surface textures are display assets only; they add no mass, physical radius, attitude, thrust, or physical dynamics.
13. **Language: Strictly English-Only:**  
    All repository artifacts, documentation, code comments, identifiers, test names, UI copy, and agent reports must be written in English.
14. **Never Create or Publish Git History Unasked:**  
    Do not run `git init`, `git add`, `git commit`, `git push`, or change branches/remotes unless explicitly commanded in the current task. Staging must always name explicit paths—never `git add .` or wildcards.

---

## 4. Default Implementation Behavior

- **Inspect First:** Check current working tree files and git status before proposing or making edits. Preserve user work and active branches.
- **Small, Coherent Slices:** Make the minimal required changes to complete the task. Avoid broad refactors during feature work.
- **Tooling Neutrality:** Coding agents, model choices, and IDE environments are user-managed tooling preferences. Do not alter provider IDs, global configuration, or billing settings.
- **Execution Truth:** Never claim a test, build, lint, or typecheck command passed unless you actually executed it in the active environment and observed exit code 0.
- **No Decorative Placeholders:** Do not introduce fake buttons, decorative progress indicators, or stubbed metrics that imply functionality that does not exist.
- **Pause and Ask:** If a requirement is genuinely ambiguous and would cause irreversible changes or alter physical semantics, state a sensible reversible default or ask a focused question.

---

## 5. Definition of Done

A task is complete only when all applicable items are true:
1. The requested change is fully implemented within the authorized scope.
2. Relevant automated validation (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`) was executed and passed cleanly.
3. For UX/UI changes, visual verification was performed across desktop and narrow viewports without horizontal overflow.
4. Scientific and data integrity contracts are preserved.
5. All documentation, links, and decision logs affected by the change are updated.
6. The final report transparently details exact files modified, verification commands and results, known limitations, and next steps.
