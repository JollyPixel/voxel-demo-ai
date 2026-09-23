# Voxel renderer feedback

This document records issues encountered while building the Floating Tomb. The demo works around engine limitations locally; the editor packages remain unchanged.

### [F-01] Chunk shadow flags require a traversal
- Area: rendering · Severity: friction
- Context: Enabling sunlight shadows for voxel chunks.
- What happened: `VoxelRendererOptions` has no `castShadow` or `receiveShadow` setting; new chunk meshes appear as meshing proceeds.
- Workaround used: Listen for `childadded` on `engine.root` (chunk meshes are added there directly) and set both flags; traverse it again when shadows are toggled.
- Suggestion: Provide shadow flag options on the voxel view.

### [F-02] Material customization is shared by surface and tileset
- Area: rendering · Severity: missing-feature
- Context: Giving gold inlays different metalness from sandstone.
- What happened: `materialCustomizer` receives the tileset and surface, not a block ID. One atlas therefore cannot tune each material independently.
- Workaround used: Use shared stone roughness, with gold distinguished by color.
- Suggestion: Expose a per-block material group or material hook.

### [F-03] Large generated worlds need a bulk-write path
- Area: world · Severity: perf
- Context: Writing four layers of a 256-voxel-long generated scene.
- What happened: `world.setVoxel` checks and dirties neighboring chunks on every write. Generation was slow for the solid island volumes.
- Workaround used: Write directly to each `VoxelLayer` during initial construction, then mesh once. This is safe for a fresh world but does not offer normal cross-layer invalidation for later edits.
- Suggestion: Add a world-level bulk transaction that coalesces dirty chunk notifications.

### [F-04] Runtime chooses a removed WebGPU shadow mode
- Area: rendering · Severity: bug
- Context: Rendering sunlight shadows with the runtime's default `WebGPURenderer`.
- What happened: The engine's renderer defaults to `PCFSoftShadowMap`; Three.js logs that this mode was removed and substitutes `PCFShadowMap` when the first frame renders.
- Workaround used: Set `runtime.world.renderer.getSource().shadowMap.type = THREE.PCFShadowMap` immediately after `Runtime.create`, before rendering.
- Suggestion: Make `PCFShadowMap` the engine default for WebGPU and document supported modes.

### [F-05] Unknown `faceTextures` keys are silently ignored
- Area: blocks · Severity: friction
- Context: Giving grass blocks dirt sides and a dirt bottom.
- What happened: The block used `negY`/`posX`/`negX`/`posZ`/`negZ` keys. Slots are named `right`/`left`/`top`/`bottom`/`front`/`back` (`shapeSlots.ts`), so every key was dropped and all six faces showed the grass top. Nothing warned, and `faceTextures` is typed `Record<string, TileRef>`.
- Workaround used: Type the demo's slot keys as a `FaceSlot` union.
- Suggestion: Export a slot-name type for built-in shapes, and warn in development when a `faceTextures` key matches no slot of the block's shape.

### [F-08] The mesher bakes no ambient occlusion
- Area: rendering · Severity: missing-feature
- Context: Giving stair treads, cornices and room corners contact shading.
- What happened: Voxel faces are lit only by the sun and the hemisphere fill, so creases between blocks read flat, which is the main difference from the shaded voxel scenes in the inspirations.
- Workaround used: A GTAO post-process (see F-10) that darkens only indirect light.
- Suggestion: Optional per-vertex AO in the mesher (the classic 3-neighbour corner rule), which also works without post-processing.

### [F-09] Distant tiles alias: no mipmaps and no atlas padding
- Area: rendering · Severity: missing-feature
- Context: Viewing the islands from the overview camera.
- What happened: `TilesetAtlas` sets `NearestFilter` and `generateMipmaps = false`, and the tile shaders force `.level(0)` because the wrapped UV jumps at each repeat. Since atlas padding was removed (#692), mips would bleed between tiles anyway. Far walls turn into moiré and shimmer when the camera moves.
- Workaround used: `scene/tileFiltering.ts` builds a padded copy of the atlas (each tile wrapped 2×2 in a double-size cell, so every mip down to one texel per cell stays pure) and replaces the chunk material's `colorNode` from `materialCustomizer`. It samples with `.grad()`, using the derivatives of the continuous, unwrapped `uv` that greedy quads carry, and finds the cell from the `tileRegion` attribute. It relies on two internals (the attribute name and greedy `uv` counting tile repeats) and only runs with greedy meshing.
- Suggestion: A `mipmaps` option on the renderer that pads the atlas and samples with gradients from the unwrapped UV, as above. The math is about 20 lines of TSL.

### [F-10] Post-processing means swapping the renderer strategy
- Area: rendering · Severity: friction
- Context: Adding GTAO with `THREE.RenderPipeline`.
- What happened: `world.renderer` is typed as the `Renderer` interface. The public `renderStrategy` field only exists on `ThreeRenderer`, so the demo checks `instanceof Systems.ThreeRenderer` and installs its own `RenderStrategy`. The pipeline's pre-pass also needs `samples: 0`: the runtime renders with MSAA, and GTAO's `textureGather` rejects multisampled depth.
- Workaround used: `scene/AmbientOcclusion.ts`, which falls back to the direct strategy for viewport cameras.
- Suggestion: A documented post-processing hook on the runtime (e.g. `renderer.setPipeline(outputNode)`).

### [F-11] No per-voxel tile variation
- Area: blocks · Severity: missing-feature
- Context: Breaking up large walls, rock and lawns.
- What happened: A block has one tile per slot, so big surfaces repeat visibly.
- Workaround used: Materials declare `alternates`: extra tiles painted from new seeds, registered as separate blocks, and the demo's `Brush` picks one from a position hash. Greedy meshing cannot merge faces across different ids, so the triangle count rises.
- Suggestion: Tile variants on the block definition, picked by the mesher from a position hash and kept mergeable when the variant is equal.

### [F-12] No level of detail for distant chunks
- Area: view · Severity: missing-feature
- Context: Keeping distant islands legible and cheap.
- What happened: `ViewDistance` can only hide chunks beyond a radius. There is no coarser mesh for far chunks, so the choice is full detail or nothing.
- Workaround used: None needed at this scale (one copy is about 181k triangles at 60 fps; four copies are 715k at 60 fps on the test machine). Mipmaps (F-09) fix the visual side of distance.
- Suggestion: Downsampled chunk meshes (2×/4× voxels, majority material) past configurable distances, with a short cross-fade.

## Summary by severity

| Severity | Entries |
|---|---|
| bug | F-06 |
| perf | F-05 |
| missing-feature | F-03, F-08, F-09, F-11, F-12 |
| friction | F-02, F-07, F-10 |
| docs | F-04 |

## Benchmark results

Runs used headless Chrome at 1440 × 900 on the local machine with seed 1337. These numbers predate the visual overhaul (larger islands, alternate tiles, GTAO); the overhauled scene measures about 160k voxels and 181k triangles for one copy, and 636k voxels and 715k triangles for four, at 60 fps in headless Chrome. FPS samples included initial shader warmup and should not be used to compare hardware. The live pane remains the source for measurements on a given machine.

| Scenario | Voxels | Chunks | Triangles | Draw calls | Write | Mesh | FPS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Greedy on, shadows on, 1 copy | 111,371 | 108 | 31,025 | 363 | 44.6 ms | 152.6 ms | 17* |
| Greedy off, shadows on, 1 copy | 111,371 | 108 | 84,284 | 363 | 40.6 ms | 164.5 ms | 19* |
| Greedy on, shadows off, 1 copy | 111,371 | 108 | 31,025 | 243 | 28.0 ms | 93.2 ms | 35* |
| Greedy on, shadows on, 4 copies | 445,921 | 388 | 124,827 | 746 | 36.2 ms | 180.6 ms | 27* |

\*FPS is a short warmup sample. The four-copy run showed substantial frame-time variation during shader compilation, so the FPS column is only a record of the sampled moment.

## What worked well

- The `VoxelRenderer` actor component plugged into the runtime and camera lifecycle without extra scene wiring.
- Named layers made garden, rock, structure, and detail visibility easy to inspect.
- The shape registry accepted a custom crossed-quad plant shape alongside all built-in shapes.
- The engine inspector exposed useful chunk and mesh counts for the benchmark pane.
