# JollyPixel voxel worlds

Procedurally built voxel worlds and a performance demo for the JollyPixel voxel renderer. Each world lives in `src/worlds/<id>/` and is picked with `?world=<id>`:

| World | Description |
|---|---|
| `floating-tomb` (default) | An Egypt-themed floating diorama. It includes a radial garden island with a giant tree, an arched viaduct with a round garden halfway along, and a seven-tier stepped tomb with an interior courtyard, galleries, and sarcophagi. |
| `test-pad` | Every block shape in its four rotations and flip combinations |

## Layout

- `src/core/` is shared by every world: the app bootstrap (`app/runWorld.ts`), the block registry and tile painters, the `Brush` and `FloatingIsland` builders, the sky, water, clouds and lighting, the benchmark pane and the editor exporter.
- `src/worlds/<id>/` holds everything specific to one world: its materials (`defineBlocks`), prefabs, zones, camera views and atmosphere, gathered into a `WorldDefinition` exported by `index.ts`.
- `src/worlds/index.ts` registers the worlds. Each one is loaded lazily, so only the selected world's tiles are painted.

To add a world, create `src/worlds/<id>/index.ts` with a default-exported `WorldDefinition` and register it in `src/worlds/index.ts`.

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
| `view` | `?view=pyramid` | Starting camera pose from the world's views. The Floating Tomb has `overview`, `platform`, `garden`, `tree`, `path`, `arch`, `rotunda`, `pyramid`, `interior` and `waterfall` |
| `pad` | `?pad=1` | Alias for `?world=test-pad` |

The pane shows construction time by zone, total voxel count, chunk and triangle counts, draw calls, geometry and texture counts, and frame time. It also toggles shadows, baked ambient occlusion, GTAO, meshing, layers, effects, view distance, and inspector overlays. The save/load button reports round trip time and JSON size.

## Open in the voxel-map editor

In the pane, the **Voxel-map editor** folder's **Export .zip** button downloads the world as an asset archive. In the editor, open **General → Map Config → Import (.zip)**, online or with `?offline`. The archive holds the map (`maps/<world>.voxelmap.json`), its block definitions and layers, and the atlas as a pixel-art asset (`textures/<world>.pixelart`). The exporter rewrites the chunk size to the editor's 16 and links the tileset to that asset. It refuses a world over the editor's 16 MiB entry limit, which a single scene copy stays under. Asset ids are derived from the world id, so choose **Replace** on import to update an earlier export. Lights, water, sky and the gold material finish are not part of the map; see F-20 to F-25 in [FEEDBACK.md](FEEDBACK.md).

## Check

```sh
npm run typecheck
npm run lint
npm run build
```

The code is generated at startup; no voxel save file is required. The editor packages are never modified by this demo. See [FEEDBACK.md](FEEDBACK.md) for API friction and measured runs.
