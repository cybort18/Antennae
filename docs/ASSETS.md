# 3D Asset Pipeline & Attribution Register — Antennae / Space Sandbox

**Repository:** [https://github.com/cybort18/Antennae](https://github.com/cybort18/Antennae)  
**Document Status:** Canonical 3D Asset Specification & Attribution Register  
**Last Verified:** 2026-10-23 (All 7 shipped files verified locally; SHA-256 and byte counts checked)

---

## 1. Non-Negotiable Asset Rules

1. **Visual Assets are Display-Only:**  
   3D mesh dimensions, texture pixels, materials, orientations, and visual scales are presentation assets. They must **never** determine physical mass, body radius, gravitational acceleration, orbital state vectors, or numerical simulation outcomes.
2. **Every Asset is an External Dependency:**  
   Before any third-party model or texture is added to the repository, inspect its individual source page, author/contributor, specific license terms, and redistribution permissions. Do not assume a whole website or repository shares a single uniform license.
3. **Preserve Exact Attribution & Record Uncertainty:**  
   Retain source URLs, author credits, and exact licensing language in this register. If an official asset page lacks an individual author line (e.g. legacy NASA pages), record that uncertainty explicitly rather than guessing.
4. **No Implied NASA Endorsement:**  
   NASA imagery and 3D models are generally available for educational use under the NASA Images and Media Usage Guidelines. However, NASA insignia, logos, and identifiers are protected; do not use NASA emblems as product branding.
5. **Mandatory Fallback Behavior:**  
   Every external asset must have a labeled procedural fallback. If a texture or 3D mesh fails to load, the application must degrade gracefully to procedural spheres or particle markers without crashing or altering simulation state.
6. **Curated Hackathon Scope:**  
   Do not import full asset libraries. The application bundles only the minimal set of assets required for its supported scenarios.

---

## 2. Complete Asset Attribution Register (Shipped Assets)

The application ships seven locally hosted visual assets totaling **10,112,134 bytes** (~9.64 MiB): six texture images (3,672,242 bytes, ~3.50 MiB) and one spacecraft model (6,439,892 bytes, ~6.14 MiB).

*Note on Asset Budget:* The initial 8 MiB asset target applied specifically to the 2D texture suite (which is well within budget at ~3.50 MiB). The GOES GLB was added under a separate lazy-load model budget and is loaded strictly on demand.

| Local Path | Asset Name | Creator / Contributor | Original Asset URL | License / Usage Terms | Required Attribution Line | Verified File Properties | Shipped Use |
|---|---|---|---|---|---|---|---|
| `public/assets/earth/blue-marble-2048.jpg` | Blue Marble: Next Generation (Base Map) | Reto Stöckli, NASA Earth Observatory (NASA GSFC) | [`land_ocean_ice_2048.jpg`](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg) via [Feature Page](https://earthobservatory.nasa.gov/features/BlueMarble) | NASA content; use consistent with [NASA Images & Media Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). No NASA logo used. | "Earth imagery: NASA Blue Marble (Reto Stöckli / NASA Earth Observatory)" | 266,599 bytes; JPEG (`FF D8 FF E0`); 2048 × 1024 px; verified 2026-10-20 | Earth surface in Earth Orbit Lab and Solar System Overview (display only). |
| `public/assets/earth/blue-marble-clouds-2048.jpg` | Blue Marble Clouds (Alpha Shell) | NASA Earth Observatory | [`cloud_combined_2048.jpg`](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg); legacy Visible Earth 57747 | NASA content; use consistent with NASA Images & Media Guidelines. Legacy page redirects and publishes no individual credit line; credited to NASA Earth Observatory. | "NASA Blue Marble Clouds / NASA Earth Observatory" | 829,367 bytes; JPEG (`FF D8 FF E0`); 2048 × 1024 px; verified 2026-10-20 | Static cloud alpha layer around Earth in Earth Orbit Lab (display only; does not represent live weather). |
| `public/assets/planets/mars.jpg` | Mars Surface Map | NASA / Jet Propulsion Laboratory & Caltech | [`Mars.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/mars/Mars.jpg) via [NASA 3D Resources: Mars](https://science.nasa.gov/3d-resources/mars/) | NASA content; Viking imagery processed at USGS; JPL/Caltech planetary database. Use consistent with NASA Guidelines. | "Mars surface: NASA / Jet Propulsion Laboratory & Caltech (USGS Viking processing)" | 972,896 bytes; JPEG (`FF D8 FF E0`); 1440 × 720 px; verified 2026-10-21 | Mars surface in Solar System Overview (display only). |
| `public/assets/planets/jupiter.jpg` | Jupiter Cloud Map | JPL & Caltech | [`Jupiter.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/jupiter/Jupiter.jpg) via [NASA 3D Resources: Jupiter](https://science.nasa.gov/3d-resources/jupiter/) | NASA content; Voyager imagery; JPL/Caltech planetary database. Use consistent with NASA Guidelines. | "Jupiter surface: JPL & Caltech (Voyager imagery)" | 225,878 bytes; JPEG (`FF D8 FF E0`); 720 × 360 px; verified 2026-10-21 | Jupiter surface in Solar System Overview (display only). |
| `public/assets/planets/venus.jpg` | Venus Surface Map (Radar-Derived) | NASA / JPL-Caltech (inferred from JPL database; source has no explicit credit line) | [`Venus.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/venus/Venus.jpg) via [NASA 3D Resources: Venus](https://science.nasa.gov/3d-resources/venus/) | NASA content; Magellan radar imagery with gaps filled. Radar-derived topography, **not natural colour**. NASA Guidelines apply. | "Venus surface: NASA/JPL-Caltech (Magellan radar, radar-derived surface)" | 1,166,974 bytes; JPEG (`FF D8 FF E0`); 1440 × 720 px; verified 2026-10-21 | Venus surface in Solar System Overview (display only; labeled radar-derived). |
| `public/assets/planets/neptune.jpg` | Neptune Illustrative Map | Don Davis & JPL/Caltech | [`Neptune.jpg`](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/image/neptune/Neptune.jpg) via [NASA 3D Resources: Neptune](https://science.nasa.gov/3d-resources/neptune/) | NASA content; fictional cloud-feature texture created for visualization; **not an observational map**. NASA Guidelines apply. | "Neptune visualization texture: Don Davis & JPL/Caltech (illustrative)" | 210,528 bytes; JPEG (`FF D8 FF E0`); 720 × 360 px; verified 2026-10-21 | Neptune surface in Solar System Overview (display only; labeled illustrative). |
| `public/assets/models/goes-r.glb` | GOES-R Spacecraft 3D Model | NASA GOES Program / NASA Science (Lockheed Martin credited on page for renderings; downloadable GLB carries no separate embedded copyright) | [`GOES-R.glb`](https://assets.science.nasa.gov/content/dam/science/missions/goes/spacecraft/3dmodel/GOES-R.glb) via [NASA GOES Model Page](https://science.nasa.gov/mission/goes-spacecraft-3d-model/) | NASA content; NASA 3D Resources states its assets are free and without copyright. NASA Guidelines apply. Visual representation only. | "GOES spacecraft 3D model: NASA Science / GOES Program" | 6,439,892 bytes; glTF 2.0 binary (`glTF` magic); SHA-256: `C3549A276B7899253C60E82B0B24A3CFFB6A39E0DAD1A8C7F30A73E8DCEB6398`; 28 meshes, 17 materials, 4 textures; verified 2026-10-21 | Render-only marker for GOES-16 reference runs in Earth Orbit Lab. Adds no mass, attitude, thrust, or physics. |

---

## 3. Shipped Runtime Asset Pipelines

### 3.1 GOES-R Spacecraft GLB Pipeline
- **Storage Location:** `public/assets/models/goes-r.glb`.
- **Loading Behavior (`src/scene/GoesSpacecraftModel.tsx`):**
  - Loaded lazily through Three.js `GLTFLoader` inside a React effect.
  - Requested **only** when `spacecraftModelForInputs` identifies that the currently displayed record is the cached GOES-16 reference state or a circular approximation derived from it.
  - Never preloaded at application startup; synthetic runs load zero GLB data.
  - Active fetch requests are aborted if the component unmounts before loading finishes.
- **Display Normalization:**
  - The model's bounding box is used to normalize display scale in scene units for visual clarity.
  - A subtle emissive and material roughness lift is applied dynamically so the high-metalness PBR mesh remains visible under scene lighting.
  - **Render-Only Invariant:** No vertices, bounds, or materials are ever read by `src/simulation/`, `src/missions/`, or `src/comparison/`.
- **Failure & Fallback Behavior:**
  - If the GLB fails to fetch or parse, the loader catches the error, logs a warning, and renders the default white `ParticleMarker`.
  - The viewport credit chip updates to `"GOES mesh unavailable · marker fallback"`.
  - Automated tests verify that blocking the GLB produces bit-identical simulation sample counts and identical mission outcomes.

### 3.2 Planetary & Earth Texture Pipeline
- **Storage Locations:** `public/assets/earth/` and `public/assets/planets/`.
- **Loading Behavior (`src/scene/useLocalTexture.ts` & `src/scene/planetSurface.ts`):**
  - Textures are loaded asynchronously using Three.js `TextureLoader`.
  - Texture instances are tracked and properly disposed (`texture.dispose()`) on unmount.
- **Failure & Fallback Behavior:**
  - If `blue-marble-2048.jpg` fails, `EarthSphere` falls back to a procedural blue/green sphere material.
  - If `blue-marble-clouds-2048.jpg` fails, the cloud sphere shell is omitted.
  - If any planetary texture fails, the planet sphere renders its documented procedural hex color from `src/solarSystem/bodies.ts`.

---

## 4. Visual Scale vs. Physical Properties Separation

The codebase strictly enforces structural separation between visual geometry and scientific data:

```typescript
// Representation in scenario state:
interface SimulationObject {
  // Scientific parameters (authoritative for physics):
  physical: {
    massKg?: number;
    radiusKm?: number;
    positionKm: Vec3;
    velocityKmS: Vec3;
  };

  // Visual parameters (used strictly by Three.js rendering):
  visual: {
    assetPath?: string;
    displayScale?: number;
    color?: string;
    renderOnlyModel?: "goes-r";
  };
}
```

- A model's bounding box is not proof of its physical radius.
- Display scale is applied via a one-way transformation (`1 scene unit = 1,000 km` in Earth Orbit Lab) that is never fed back into the physics engine.
- Marker sizes and orbit line widths are visually exaggerated for visibility and disclosed as such.

---

## 5. Deliberately Rejected Assets Register

The following asset types were formally evaluated and rejected to protect repository scope, legal clarity, and performance:

1. **Solar System Scope Textures:**  
   *Reason for Rejection:* Although distributed under CC BY 4.0, textures contain fictionalized terrain in unmapped regions. The team chose official NASA 3D Resources imagery to maintain authentic agency provenance.
2. **Third-Party Spacecraft Models (Sketchfab, TurboSquid, Free3D):**  
   *Reason for Rejection:* Licensing terms on commercial hubs are often ambiguous, prohibit redistribution, or require accounts. Only the official NASA Science GOES-R model is shipped.
3. **NASA Insignia & Program Logos:**  
   *Reason for Rejection:* Protected under federal law (14 CFR 1221). NASA logos may not be used as product branding or decorative UI badges.
4. **Heavy Earth Meshes & Topographical GeoTIFFs:**  
   *Reason for Rejection:* Multi-gigabyte elevation models exceed web constraints and provide zero benefit for high-altitude orbital mechanics.
5. **Photometric Star Panoramas / HDRIs:**  
   *Reason for Rejection:* Large downloads rejected in favor of a lightweight, deterministic procedural star field (`src/scene/Starfield.tsx`).

---

## 6. Workflow for Evaluating Future Assets

Any future visual asset considered for Antennae must follow this verification protocol:
1. **Source Verification:** Document the direct URL, originating agency or artist, and per-item usage license.
2. **Attribution Audit:** Verify the required attribution text and whether redistribution in an open-source web application is permitted.
3. **Format & Size Review:** Prefer `.glb` for 3D meshes (under 10 MiB) and `.jpg` for textures (under 2048×1024). Test Draco/Meshopt compression if size exceeds 5 MiB.
4. **Local Bundling:** Save assets under `public/assets/`. Never rely on third-party hotlinking for production rendering.
5. **Implement Fallback:** Create a labeled procedural fallback before wiring the asset into scene components.
6. **Register Update:** Add the asset's verified path, checksum, byte size, and attribution to this document.
