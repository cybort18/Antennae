# Design Guidelines & UX Architecture — Antennae / Space Sandbox

**Repository:** [https://github.com/cybort18/Antennae](https://github.com/cybort18/Antennae)  
**Document Status:** Canonical UX/UI Specification (V3 Minimalist Workspace Standard)  
**Last Verified:** 2026-10-24 (Responsive viewports: 1600×1000, 1440×900, 1280×800, 900×800, 390×844)

---

## 1. Experience Principles

Antennae's interface is designed around four foundational principles:

1. **Explore → Modify → Simulate → Understand:**  
   The primary scientific loop must be immediately obvious without requiring documentation. A user enters a surface, sees the initial state, adjusts a physical control, triggers an explicit run, and reads the calculated difference.
2. **Cognitive Calm & Canvas Dominance:**  
   The 3D space environment is the central workspace. Cluttered three-column layouts and permanent floating panels are rejected. Secondary details, long provenance notes, and reference data live inside progressive disclosures or on-demand drawers.
3. **Task-First Interaction Hierarchy:**  
   In goal-driven modes (Mission Designer), the objective, current outcome, inputs, and primary action take visual precedence. Contextual help, technical explanations, and comparison charts are positioned downstream.
4. **Absolute Scientific Honesty:**  
   Graphics and UI copy must never misrepresent physical reality:
   - Every physical number displays its unit (km, s, km/s, kg).
   - Exaggerated display scales (particle markers, line widths) carry explicit **NOT TO SCALE** notices.
   - Playback is sample-quantized: scrubbing and playback step through real recorded engine states, never interpolated approximations.
   - Stopped, invalid, or truncated runs show the engine's exact warning verbatim and are never animated as completed.
   - Technical truth is never compromised to make the interface look prettier.

---

## 2. Canonical Workspace Architecture (V3 Standard)

The V3 redesign establishes a clean, canvas-first interface where the 3D scene occupies the full viewport, and chrome is minimized.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ TopBar: Mode Tabs [Solar System | Earth Orbit Lab | Mission] │ Trajectory│
├─────────────────────────────────────────────────────────────────────────┤
│ [⊞ Objects & data] (Floating Button)                                    │
│                                                                         │
│                                                   ┌───────────────────┐ │
│                                                   │ Contextual Panel: │ │
│                                                   │ Inspector (Lab)   │ │
│                        3D VIEWPORT                │ or Mission Panel  │ │
│                  (Full-Bleed Canvas)              │ (Floating Right)  │ │
│                                                   └───────────────────┘ │
│                                                                         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ [Show chart ▲] (Collapsible Analysis Drawer)                            │
├─────────────────────────────────────────────────────────────────────────┤
│ Playback Timeline: [Play/Pause] [Step] [Scrub Timeline] [Speed Multiplier]
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Four Workspace Zones

1. **TopBar (Navigation & Role Switcher):**  
   - Minimalist header containing the Antennae product title and the three primary mode tabs: **Solar System**, **Earth Orbit Lab**, and **Mission Designer**.
   - In simulation modes, contains the **Trajectory: Baseline | Candidate** toggle that selects which recorded run the viewport camera and timeline follow.
   - *Design Invariant:* No duplicate play, pause, or reset buttons exist in the TopBar. Playback controls belong strictly in the bottom timeline.
2. **Left Drawer Overlay (`sidebarLeftOpen` default `false`):**  
   - Triggered by a compact floating `⊞ Objects & data` button in the upper-left of the canvas.
   - Slides out as an overlay drawer without compressing or resizing the WebGL viewport.
   - Houses the Object Browser (scene hierarchy and camera framing), Reference Data panel (cached JPL Horizons preset loader), and Model Limitations notice.
   - Includes a prominent close button (`✕`) and automatically closes on outside clicks or Escape key.
3. **Contextual Right Panel (Inspector or Mission Designer):**  
   - Floats over the right side of the canvas on desktop.
   - In **Earth Orbit Lab**: displays candidate initial altitude and speed inputs, an "Unrun changes" advisory badge, the primary **Run candidate** action, and the baseline replacement control.
   - In **Mission Designer**: displays the task-first mission challenge card, PASS/FAIL outcome card, inputs, **Run Mission** action, criteria checklist, and compact metrics.
4. **Bottom Analysis & Playback Zone:**  
   - **Collapsible Analysis Drawer:** Collapsed by default; expands upward via **Show chart** to reveal the dependency-free SVG altitude-versus-simulated-time chart and comparison summary metrics.
   - **Playback Timeline:** Bounded strictly to recorded engine samples. Features Play/Pause, Step ±1 sample, Reset, sample-quantized scrubber, and time multiplier (10x, 60x, 300x, 1000x).

---

## 3. Surface-Specific Hierarchy & Flow

### 3.1 Solar System Overview
- **Visual Composition:** Compressed schematic layout of the Sun, eight planets, and near-Earth asteroid **101955 Bennu** against a deterministic procedural star field.
- **Labels & Collision Resolution:** Crisp DOM-rendered button labels projected from 3D camera coordinates each frame. A deterministic screen-space priority resolver (`resolveSolarSystemLabelCollisions`) hides lower-priority overlapping labels during multi-year motion while keeping the selected body and Sun anchored; every body remains selectable in the left `Bodies` list.
- **Interactions:**
  - Selecting a body opens a compact floating card displaying sourced NASA/JPL physical and orbital facts (mean radius, sidereal period, semi-major axis, eccentricity, inclination) and display-asset attribution.
  - Camera focus transitions smoothly to the selected body; the **Overview view** button in the `Selected body` panel header resets to system framing without requiring the user to scroll to the bottom of the panel.
  - Focusing **101955 Bennu** lazy-loads the official NASA VTAD 3D GLB shape model (with a procedural faceted rocky fallback at wide overview or if asset loading fails).
  - **Opt-In Schematic Motion:** The bottom **Illustrative Schematic Motion** strip (`0–3,650 Earth days`, paused at `+0.0 d` by default) advances bodies along compressed circular guides at period-proportional rates (`10`, `60`, `365`, `1,000 d/s`) without invoking the two-body physics engine.
  - *Disclosures:* Prominent badges state **REFERENCE VISUALIZATION · NOT TO SCALE** and **ILLUSTRATIVE MOTION · NOT AN EPHEMERIS**.

### 3.2 Earth Orbit Lab
- **Visual Composition:** Central Earth with NASA Blue Marble surface texture and static cloud layer (with procedural fallback), white test particle marker, and recorded orbit trail.
- **Baseline vs. Candidate Language:**
  - Baseline run is rendered in cool blue (`#4a90e2`).
  - Candidate run is rendered in cyan (`#00e5ff`).
  - Trajectory lines use brightness modulation to distinguish past traveled samples from future samples.
- **Parameter Modification Flow:**
  - Editing altitude or speed flags candidate parameters with an **Unrun changes** chip.
  - The engine does *not* execute mid-keystroke. The user must click **Run candidate** to integrate the new orbit.
  - Clicking **Restore baseline parameters** resets inputs and re-runs to match the baseline.
  - Clicking **Replace baseline with candidate…** prompts an inline two-step confirmation, promoting the candidate to the new reference.

### 3.3 Mission Designer
- **Visual Composition:** Dominant 3D scene displaying Earth and the mission orbit, paired with a task-first right panel.
- **Linear Reading Order:**
  1. *Objective Card:* Concise challenge definition: "Target: 400 km stable circular orbit (tolerance ±20 km, clearance ≥200 km)".
  2. *Outcome Card:* Prominent, high-contrast status banner: **PASS**, **FAIL**, or **NOT EVALUABLE** with a plain-language reason.
  3. *Input Controls:* Target altitude (250–2,000 km), initial altitude, and tangential speed, accompanied by the helper button **Use ideal circular start**.
  4. *Primary Action:* Large, full-width **Run Mission** button.
  5. *Criteria Checklist:* Three explicit status rows (coverage, altitude tolerance, clearance) showing pass/fail icons and observed numerical values.
  6. *Progressive Disclosures:* Native `<details>` tags hide theoretical formulas, detailed sample metrics, and comparison summaries until expanded.

---

## 4. Visual Language & Semantic Tokens

### 4.1 Color System

| Token | Hex / Value | Semantic Usage |
|---|---|---|
| `bg-space` | `#02050a` / `#070d16` | Deep space canvas and workspace shell background |
| `surface-panel` | `rgba(7, 13, 22, 0.97)` | Instrument-grade dark floating panel surfaces |
| `border-subtle` | `rgba(133, 164, 194, 0.14)` | Hairline dividers, card borders, subtle bounding boxes |
| `accent-baseline` | `#86a9ff` | Baseline scenario, reference state, cool blue trajectory |
| `accent-candidate` | `#7bd7e8` / `#8fe9f3` | Candidate draft, modified parameters, cyan trajectory |
| `action-primary` | `#103a48` | Restrained instrument-grade primary button fill (`Run candidate`, `Run Mission`) |
| `status-pass` | `#4cc38a` | Evaluated mission pass, verified criteria, green outcome card |
| `status-warn` | `#efbd61` | Target markers, coarse timestep warning, unrun changes badge |
| `status-fail` | `#f27b7d` | Evaluated mission failure, invalid input, stopped run alert |
| `text-primary` | `#e7f0fa` | Primary headings, active metrics, critical copy |
| `text-secondary` | `#9aacbe` | Supporting descriptions, units, labels, metadata |

### 4.2 Typography & Numbers
- **Font Stack:** Clean sans-serif (`Inter`, `Segoe UI`, `system-ui`, `-apple-system`, `sans-serif`) paired with technical monospace (`ui-monospace`, `SFMono-Regular`, `Cascadia Mono`, `Consolas`, `monospace`) for numerical readouts, ranges, and provenance queries.
- **Tabular Numerals:** All coordinates, times, speeds, altitudes, and schematic day counters use `font-variant-numeric: tabular-nums` to prevent layout jitter during scrubbing and playback.
- **Type Hierarchy:**
  - Section Headings: `0.72–0.74rem` semibold, uppercase with restrained letter-spacing (`0.08–0.11em`).
  - Metric & Fact Values: `0.71–0.80rem` monospace with `tabular-nums`.
  - Labels & Units: `0.68–0.74rem` regular with muted secondary coloring.

### 4.3 UI/UX Quality & Anti-Slop Discipline
Antennae is a scientific 3D sandbox, not a generic SaaS marketing dashboard. All UI changes adhere to these editorial and usability guardrails:
1. **Canvas First, Chrome Second:** The 3D viewport is the primary workspace. Side panels stay compact and docked to the outer edges; center-screen modals, hero banners, and decorative card walls are prohibited.
2. **Restrained Instrument Surfaces:** Prefer flat, high-legibility dark surfaces (`rgba(7, 13, 22, 0.97)`) and hairline dividers (`1px solid rgba(133, 164, 194, 0.14)`) over nested boxes-within-boxes, heavy drop shadows, or neon glow effects.
3. **One Clear Primary Action per Surface:** Each simulation panel has one unmistakable primary CTA (**Run candidate** in Earth Orbit Lab, **Run Mission** in Mission Designer). Helper actions (**Use circular speed**, **Use ideal circular start**, **Overview view**) use secondary or inline styling so they never compete with the primary run trigger.
4. **No Redundant Copy or Decorative Chrome:** Do not repeat the same range, status, or unit in adjacent labels, badges, and helper hints. Every badge, chip, and note must communicate distinct operational or scientific state.
5. **Consistent Header & Navigation Geometry:** The top bar maintains a consistent brand lockup and `ModeTabs` position across **Solar System**, **Earth Orbit Lab**, and **Mission Designer** so switching modes never causes the navigation chrome to jump.

---

## 5. Controls & Interaction Behaviors

1. **Numeric Inputs:**
   - Text inputs for altitude and speed commit values on **Enter** or on **blur**. This prevents half-typed numbers (e.g. typing a decimal point) from triggering premature validation errors.
   - Sliders update candidate draft values immediately.
2. **Playback Timeline:**
   - Scrubbing snaps strictly to the nearest recorded sample index.
   - Time multipliers (10x to 1000x) advance simulated seconds per real second without altering numerical accuracy or step sizes.
   - A stopped run stops the scrubber at the last valid recorded sample and displays the engine warning.
3. **Mode Switching:**
   - Switching among Solar System Overview, Earth Orbit Lab, and Mission Designer pauses playback.
   - Mode switching preserves baseline, candidate, draft, and playback states; it never resets in-memory data.
   - Focus shifts programmatically to the main heading of the newly selected surface.

---

## 6. Progressive Disclosure & Drawer Systems

To prevent cognitive overload, secondary information is hidden behind predictable disclosures:
- **Left Drawer (`⊞ Objects & data`):** Encapsulates the entire scene tree, reference data loader, and model limitations notice.
- **Analysis Drawer (`Show chart ▲`):** Encapsulates the altitude-vs-time SVG chart and comparison delta table.
- **Native `<details>` Elements:** Used for long provenance text, Horizons query options, and mathematical derivations. Disclosures feature clear hover cues and retain their open/closed state during session interaction.

---

## 7. Responsive Layout & Viewport Adaptations

| Viewport Category | Width Range | Layout Adaptation |
|---|---|---|
| **Large Desktop** | $\ge 1280$ px | Full-bleed 3D canvas; floating right panel (340 px); floating left drawer; bottom timeline (54 px). |
| **Standard Laptop** | 900–1279 px | Floating right panel narrows slightly (300 px); left drawer overlays without resizing canvas. |
| **Tablet / Narrow** | 768–899 px | Right panel docks to the bottom edge below the canvas; chart drawer adapts to single-column layout. |
| **Mobile Phone** | $< 768$ px | **Task-First Reordering:** In Mission Designer, the mission panel is ordered *above* the canvas so users see the objective, controls, and Run action without scrolling past WebGL. Canvas displays only the selected body label to prevent overlapping labels. |

---

## 8. Accessibility (a11y) & Focus Management

1. **Non-Color Indicators:** Color is never used as the sole indicator of state. PASS/FAIL statuses, baseline/candidate series, and warnings are always accompanied by text labels, distinct icons (`✓`, `✕`, `⚠`), or line-pattern legends.
2. **Focus Management:**
   - When switching modes via ModeTabs, focus is moved to the target surface's primary heading (`<h1>` or `<h2>`) to prevent focus loss.
   - When opening the left drawer, focus moves into the drawer; pressing Escape closes the drawer and returns focus to the toggle button.
3. **Contrast:** Text-to-background contrast ratios exceed WCAG AA standards (minimum 4.5:1 for body copy, 3:1 for large headers and buttons).
4. **Motion Safety:** Decorative motion and camera transitions respect `prefers-reduced-motion` settings.

---

## 9. State Catalog

Every surface handles the following explicit states:
- **Ready / Baseline:** Clean default state with valid parameters and initial trajectory.
- **Unrun Changes:** Parameter inputs modified; flagged with an amber warning badge indicating the displayed trajectory reflects prior run parameters.
- **Running / Integrating:** Brief active state during engine integration.
- **Completed:** Full simulation trajectory available; metrics and timeline scrubber enabled.
- **Stopped Early:** Integration stopped due to impact radius, singularity, or energy divergence; engine warning displayed verbatim; scrubber bounded to last valid sample.
- **Invalid Input:** Validation error shown inline beneath the offending input field; Run button disabled or blocked.
- **Mission Evaluated:** Outcome card rendered (green for PASS, red for FAIL, amber for NOT EVALUABLE) with detailed criterion checks.
- **Asset Fallback:** Procedural sphere rendered if Earth surface texture fails; procedural colors rendered if planet textures fail; particle marker rendered if GOES GLB fails to load.

---

## 10. Visual Acceptance Criteria

A design pass or visual feature is acceptable only when:
- [x] Zero horizontal page overflow at 1600×1000, 1280×800, and 390×844 viewports.
- [x] Primary action (Run candidate or Run Mission) is immediately visible without scrolling on desktop.
- [x] Left drawer overlays cleanly and can be opened and closed with zero canvas flickering.
- [x] Chart drawer expands cleanly without dislocating the bottom playback timeline.
- [x] Mode switching pauses playback, preserves all run records, and restores camera framing.
- [x] Exaggerated visual elements carry prominent **NOT TO SCALE** disclosures.
- [x] All status changes produce clear text and visual cues.
