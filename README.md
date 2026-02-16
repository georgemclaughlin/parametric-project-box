# Parametric Project Box

Static browser app for generating simple electronics enclosure STLs (body + lid) with a live 3D preview.

## What it does
- Parametric **outer** dimensions (`length`, `width`, `height`)
- Live calculated **internal cavity** readout
- Flat mating surfaces with rounded corner footprint (better lid seating)
- Lid lip fit controls (`lipHeight`, `lipClearance`)
- Optional advanced controls (collapsed by default):
  - Fasteners (posts, holes, countersink)
  - Vents
- Preview layout: body + upside-down lid placed side-by-side
- Semi-transparent preview materials for easier visual inspection
- Export options:
  - Primary: `Download STL (Body + Lid)`
  - Secondary: `Body Only`, `Lid Only`
- Local preset save/load/delete (`localStorage`) with `ESP32 Base` default

## Tech stack
- No-build static app (`index.html`, `styles.css`, ES modules)
- OpenJSCAD (`@jscad/modeling`, `@jscad/io`) for geometry + STL export
- Three.js for rendering and camera controls

## Run locally
Use a local web server (do **not** open with `file://`):

```bash
python3 -m http.server 4173
```

Open: `http://127.0.0.1:4173/`

## Deploy to GitHub Pages
1. Push the repository.
2. In GitHub repo settings, enable Pages from branch root.
3. App serves directly from `index.html`.

## Notes and caveats
- Units are millimeters.
- Geometry validation blocks invalid combinations and preserves the previous valid preview.
- If browser blocks the primary export action, allow multiple downloads for the site.
- Rendering requires WebGL.

## File map
- `index.html`: UI structure and controls
- `styles.css`: layout and styling
- `src/main.js`: app wiring, regen loop, status, presets, export handlers
- `src/model/box.js`: body/lid assembly + preview placement transforms
- `src/model/features.js`: geometric primitives/features (shell, lip, holes, vents, posts)
- `src/viewer.js`: Three.js scene, controls, mesh updates
- `src/validators.js`: parameter constraints and warnings
- `src/export.js`: STL serialization/download
- `src/state.js`: defaults + form state mapping
- `src/presets.js`: localStorage preset persistence
