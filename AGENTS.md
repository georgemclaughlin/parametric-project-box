# AGENTS.md

Guidance for agents working in this repository.

## Project intent
Generate printable parametric project boxes in the browser and export STL files. Keep the app static and GitHub Pages compatible.

## Constraints
- No build tooling by default (plain HTML/CSS/JS modules).
- Keep runtime browser-only; do not add server dependencies.
- Prefer small, explicit modules over framework adoption.
- Preserve millimeter units and current default assumptions for FDM printing.
- Keep posts auto-corner (no manual post offset UI).
- Centered board standoffs are additive to corner posts (do not replace lid fastener corners).
- Keep fasteners and centered standoffs as separate advanced UI sections.
- Keep countersink lid-hole behavior visibly effective at defaults (preview and STL).
- Keep per-face vent and cutout parameter groups hidden unless that face-level enable checkbox is checked.

## Local development
Run with a static server from repo root:

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`.

## Cache busting workflow
- Do not hand-edit mixed `?v=` query strings.
- Use one command to keep all local module and asset version tokens in sync:

```bash
node scripts/bump-cache-version.mjs
```

- Optional explicit set:

```bash
node scripts/bump-cache-version.mjs --set 10
```
- Mandatory before any push:
  - Always run `node scripts/bump-cache-version.mjs` immediately before committing/pushing changes so shipped assets never use stale cache tokens.

## Validation checklist before finishing
1. JS syntax checks pass:
   - `node --check src/main.js`
   - `node --check src/model/features.js`
   - `node --check src/model/box.js`
   - `node --check src/viewer.js`
2. Browser smoke test:
   - Page loads from local server
   - Status reaches `Model updated...`
   - No console errors
3. Confirm export buttons still work:
   - Combined export triggers both files
   - Individual export buttons still work
4. Standoff edge case:
   - With centered standoffs enabled, `standoffHoleDiameter = 0` stays valid and model still updates
5. Countersink check:
   - With default params, toggling `countersink` changes lid geometry (preview tris and exported STL hash/size)
6. Faces UX check:
   - In `Advanced: Faces`, per-face vent parameters are hidden until `Enable vents` is checked
   - Per-face cutout profile/geometry/offset parameters are hidden until `Enable cutout` is checked

## Architecture map
- `src/main.js`: form events, debounced regeneration, status/errors/hints/overlay, presets, exports
- `src/model/features.js`: primitive geometry composition (shell, posts, per-face vents/cutouts, lid details)
- `src/model/fit.js`: fit tolerance derivation, auto-corner post placement math, centered standoff center math, per-face vent/cutout helper math
- `src/model/box.js`: body/lid assembly plus preview-only transforms
- `src/viewer.js`: Three.js rendering pipeline and camera behavior
- `src/validators.js`: hard errors and soft warnings
- `src/presets.js`: local preset persistence
- `src/export.js`: STL serializer + download trigger
- `src/state.js`: defaults and form hydration/extraction

## UX principles to keep
- Default view should be understandable without expanding advanced controls.
- Avoid camera reset on normal parameter changes.
- Keep clear distinction between outer dimensions and internal cavity output.
- Prefer a single user-facing fit control (`fitTolerance`) over multiple coupled controls.
- Keep fastener and standoff controls visually separated to avoid blending distinct concepts.
- Prioritize successful printable output over adding many niche controls.

## Non-goals (unless explicitly requested)
- Adding backend services
- Heavy framework migration
- CAD import workflows
