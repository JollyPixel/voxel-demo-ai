# Floating Tomb

An Egypt-themed floating voxel diorama and performance demo for the JollyPixel voxel renderer. The scene includes a radial garden island, an alternating colonnade and garden bridge, and a stepped tomb with an interior courtyard, galleries, and sarcophagi.

## Run

Place this repo beside `editor` in `D:/Sources/JollyPixel` (or another shared parent). In `editor`, build the workspace with `pnpm -r build`. Then run:

```sh
npm run setup
npm run dev
```

`setup` links the editor packages, TypeScript, Oxlint, Vite, Three.js, and the shared `@openally` configs into this repo's ignored `node_modules`. It uses the installed editor workspace without downloading duplicate tooling. Open the local URL printed by Vite.

The UI uses `@jolly-pixel/ui` for its dock, pane, controls legend, and performance tile. Press **F3** to toggle the pane. Hold the middle mouse button to look around, use **WASD** to fly, **Space/Shift** to rise or descend, and scroll while looking to change speed.

## Query parameters

| Parameter | Example | Effect |
|---|---|---|
| `seed` | `?seed=42` | Reproducible island and vegetation detail |
| `greedy` | `?greedy=0` | Disable greedy meshing |
| `shadows` | `?shadows=0` | Disable sunlight shadows |
| `copies` | `?copies=4` | Tile up to four scene copies for stress testing |
| `ao` | `?ao=0` | Disable screen-space ambient occlusion (GTAO) |
| `mips` | `?mips=0` | Sample tiles at full resolution only, as the engine does (distant blocks sparkle) |
| `view` | `?view=pyramid` | Start at `overview`, `platform`, `path`, `arch`, `pyramid`, `interior`, or `waterfall` |
| `pad` | `?pad=1` | Display the shape and orientation test pad |

The pane shows construction time by zone, total voxel count, chunk and triangle counts, draw calls, geometry and texture counts, and frame time. It also toggles shadows, ambient occlusion, meshing, layers, effects, view distance, and inspector overlays. The save/load button reports round trip time and JSON size.

## Check

```sh
npm run typecheck
npm run lint
npm run build
```

The code is generated at startup; no voxel save file is required. The editor packages are never modified by this demo. See [FEEDBACK.md](FEEDBACK.md) for API friction and measured runs.
