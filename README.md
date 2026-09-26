# JollyPixel voxel worlds

Procedurally built voxel worlds and a performance demo for the JollyPixel voxel renderer. Each world lives in `src/worlds/<id>/` and is picked with `?world=<id>`:

| World | Description |
|---|---|
| `floating-tomb` (default) | An Egypt-themed floating diorama. It includes a radial garden island with a giant tree, an arched viaduct with a round garden halfway along, and a seven-tier stepped tomb with an interior courtyard, galleries, and sarcophagi. |
| `valley-shrine` | A Japanese temple valley ringed by snow-capped mountains that sink into a cloud sea. It has a vermilion main hall inside a copper-roofed cloister, a five-storey pagoda, a koi pond with a drum bridge and a tea house, a raked dry garden, cherry groves, a stream fed by a waterfall that leaves through a gorge and falls off the edge, and an inner shrine on a mountain ledge reached by a stair of torii. |
| `test-pad` | Every block shape in its four rotations and flip combinations |

## Layout

- `src/core/` is shared by every world: the app bootstrap (`app/runWorld.ts`), the block registry and tile painters, the `Brush`, `FloatingIsland` and `Heightfield` builders, the sky, water, clouds and lighting, the benchmark pane and the editor exporter.
- `src/worlds/<id>/` holds everything specific to one world: its materials (`defineBlocks`), prefabs, zones, camera views and atmosphere, gathered into a `WorldDefinition` exported by `index.ts`.
- `src/worlds/index.ts` registers the worlds. Each one is loaded lazily, so only the selected world's tiles are painted.

To add a world, create `src/worlds/<id>/index.ts` with a default-exported `WorldDefinition` and register it in `src/worlds/index.ts`.

Every world is written into a single voxel layer. A later write replaces whatever the cell held, so zones build from the ground up: terrain, then structures, then plants.

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
| `world` | `?world=test-pad` | World to build, `floating-tomb` by default |
| `seed` | `?seed=42` | Reproducible island and vegetation detail |
| `greedy` | `?greedy=0` | Disable greedy meshing |
| `shadows` | `?shadows=0` | Disable sunlight shadows |
| `copies` | `?copies=4` | Tile up to four copies of the world for stress testing |
| `ao` | `?ao=0` | Disable the ambient occlusion baked into chunk vertices |
| `gtao` | `?gtao=1` | Add screen-space ambient occlusion (GTAO) as a camera post-process |
| `mips` | `?mips=0` | Sample tiles with nearest filtering only, without the engine's distant-tile averaging (distant blocks sparkle) |
| `view` | `?view=pyramid` | Starting camera pose from the world's views. The Floating Tomb has `overview`, `platform`, `garden`, `tree`, `path`, `arch`, `rotunda`, `pyramid`, `interior` and `waterfall`. The Valley Shrine has `overview`, `valley`, `temple`, `hall`, `pagoda`, `garden`, `bridge`, `drygarden`, `shrine`, `cascade`, `overlook` and `peaks` |
| `pad` | `?pad=1` | Alias for `?world=test-pad` |

The pane shows construction time by zone, total voxel count, chunk and triangle counts, draw calls, geometry and texture counts, and frame time. It also toggles shadows, baked ambient occlusion, GTAO, meshing, effects, view distance, and inspector overlays. The scene and the sun never move, so the sun's shadow map is drawn once after meshing and again only when a toggle rebuilds the chunks. The save/load button reports round trip time and JSON size.

## Open in the voxel-map editor

In the pane, the **Voxel-map editor** folder's **Export .zip** button downloads the world as an asset archive. In the editor, open **General → Map Config → Import (.zip)**, online or with `?offline`. The archive holds the map's layers (`maps/<world>.voxelmap.json`, a version 2 document) and a tileset asset (`tilesets/<world>.tileset.json`) with the atlas pixels, block definitions and material finishes. The exporter links the map's tileset to that asset in slot 0; the editor re-partitions the map into its own chunk size on import. It refuses a world over the voxel-map editor's import limits (64 MiB per entry, 128 MiB in total, decoded). One copy of either world fits: the Valley Shrine's map is 21.5 MiB and its tileset 0.4 MiB (see F-9). Asset ids are derived from the world id, so choose **Replace** on import to update an earlier export. Turn on **Reflections** in the editor's View section to see the gold finish. Lights, water and sky belong to the scene, not the map. See F-9 to F-11 in [FEEDBACK.md](FEEDBACK.md) for the open interop issues.

## Check

```sh
npm run typecheck
npm run lint
npm run build
```

The code is generated at startup; no voxel save file is required. The editor packages are never modified by this demo. See [FEEDBACK.md](FEEDBACK.md) for API friction and measured runs.
