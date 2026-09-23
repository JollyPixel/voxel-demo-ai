# Floating Tomb

An Egypt-themed floating voxel diorama and performance demo for the JollyPixel voxel renderer. The scene includes a radial garden island with a giant tree, an arched viaduct with a round garden halfway along, and a seven-tier stepped tomb with an interior courtyard, galleries, and sarcophagi.

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
| `ao` | `?ao=0` | Disable the ambient occlusion baked into chunk vertices |
| `gtao` | `?gtao=1` | Add screen-space ambient occlusion (GTAO) as a camera post-process |
| `mips` | `?mips=0` | Sample tiles with nearest filtering only, without the engine's distant-tile averaging (distant blocks sparkle) |
| `view` | `?view=pyramid` | Start at `overview`, `platform`, `garden`, `tree`, `path`, `arch`, `rotunda`, `pyramid`, `interior`, or `waterfall` |
| `pad` | `?pad=1` | Display the shape and orientation test pad |

The pane shows construction time by zone, total voxel count, chunk and triangle counts, draw calls, geometry and texture counts, and frame time. It also toggles shadows, baked ambient occlusion, GTAO, meshing, layers, effects, view distance, and inspector overlays. The save/load button reports round trip time and JSON size.

## Check

```sh
npm run typecheck
npm run lint
npm run build
```

The code is generated at startup; no voxel save file is required. The editor packages are never modified by this demo. See [FEEDBACK.md](FEEDBACK.md) for API friction and measured runs.
