# Voxel renderer feedback

Open issues found while building the Floating Tomb, grouped by subject. The demo works around engine limitations locally; the editor packages remain unchanged.

Entries F-01 to F-10 were fixed in the editor workspace and the demo now uses those APIs: chunk shadow flags, material groups, `VoxelWorld.transaction()`, the WebGPU shadow-map default, typed face slots, baked ambient occlusion, distant-tile averaging and `camera.postProcessing`. They are removed from this list; git history keeps their write-ups. Numbers are kept stable, so the gaps are expected.

## Post-processing and render strategies

### [F-13] Order-independent transparency and post-processing cannot be combined
- Area: rendering · Severity: missing-feature
- Context: The demo's water is transparent and relies on three.js sorting. The voxel-map editor composites transparency with `VoxelTransparencyRenderer`, installed as a whole `RenderStrategy`.
- What happened: A `RenderStrategy` owns the frame, and `camera.postProcessing` only works under the default strategy. `VoxelTransparencyRenderer` is not a node: it swaps `setRenderObjectFunction` and composites through its own targets. A camera therefore gets either weighted blended transparency or a post-processing pipeline, not both.
- Workaround used: None needed. The demo does not use the transparency renderer.
- Suggestion: Split "how the scene is drawn" from "what happens after". The strategy renders into a target, and a camera's pipeline reads that target instead of calling `pass()` itself, for example by passing a scene texture node through `PostProcessingContext`.

### [F-16] Post-processing passes render at canvas size in a viewport
- Area: rendering · Severity: perf
- Context: Reviewing `camera.postProcessing` for split-screen cameras.
- What happened: `pass()` sizes its targets from the drawing buffer, not the camera's viewport. A half-screen camera renders a full-canvas pass, then the pipeline squeezes it into its viewport. The result is correct but costs about twice the fill rate per camera. Drawing inside a viewport has not been checked on a GPU yet; the demo only uses a full-canvas camera.
- Workaround used: None needed.
- Suggestion: Size the pass through `PassNode.setViewport` or `resolutionScale` from the camera's viewport, which requires the engine to build the scene pass itself (see F-13).

### [F-15] Scenes see the renderer only as an interface
- Area: rendering · Severity: friction
- Context: Installing a custom `RenderStrategy` from a scene's `awake()`.
- What happened: `runtime.renderer` is a `ThreeRenderer`, but a scene only has `this.world.renderer`, typed as the `Renderer` interface. The voxel-map editor's `installTransparency` still checks `instanceof Systems.ThreeRenderer` to reach `renderStrategy`.
- Workaround used: None in the demo. Post-processing lives on the camera, and `main.ts` uses `runtime.renderer`.
- Suggestion: Only worth doing if strategies installed from scenes become common. Type `World` by its renderer, or expose the strategy on the `Renderer` interface.

## Meshing and scale

### [F-19] Baked ambient occlusion cuts greedy merging by two thirds
- Area: rendering · Severity: perf
- Context: Turning on `ambientOcclusion` for the whole scene.
- What happened: Greedy faces only merge when their corner shading matches, so every crease splits the quads around it. On this scene greedy meshing now saves 22% of triangles (332k against 424k) where it saved 63% before AO. Mesh time also includes the bake. The engine docs report the same effect.
- Workaround used: None needed; the enlarged scene still runs at 60 fps.
- Suggestion: Keep geometry mergeable by sampling occlusion in the shader, for example from a per-chunk occupancy texture, or offer AO only on non-greedy chunks near the camera.

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
- Workaround used: None needed at this scale: one copy is 332k triangles and four copies are 1.34M, both at 60 fps on the test machine. Distant-tile averaging handles the visual side of distance.
- Suggestion: Downsampled chunk meshes (2×/4× voxels, majority material) past configurable distances, with a short cross-fade.

## World writes

### [F-18] Writes inside a transaction cost twice the old direct layer writes
- Area: world · Severity: perf
- Context: Generating the scene through `world.setVoxel` inside one `world.transaction()`.
- What happened: Writing 285k voxels takes about 260 ms, about 0.9 µs per voxel. The earlier build wrote straight into each `VoxelLayer` at about 0.4 µs per voxel. The two runs used different scene sizes on the same machine, so the ratio is approximate.
- Workaround used: None; the build still finishes in a quarter of a second. Not tried yet: collecting the cells and calling `world.patchVoxels()` once per layer.
- Suggestion: Profile the per-write path inside a transaction (option object, transform packing, patch bookkeeping), or document `patchVoxels` as the fast path for generation.

## Camera and runtime API

### [F-14] `OrbitFlyCamera` does not accept camera options
- Area: rendering · Severity: friction
- Context: Enabling GTAO when the fly camera is created.
- What happened: `OrbitFlyCamera` passes only `fov` to `CameraComponent`, with `near` and `far` fixed at 0.1 and 2000, so `postProcessing`, `viewport`, `depth` and the clipping planes cannot be set in its options.
- Workaround used: Create it with `addComponentAndGet` and set `camera.postProcessing` afterwards.
- Suggestion: Let `OrbitFlyCameraOptions` extend `CameraOptions` and forward them, as `Camera3DControls` does.

### [F-17] `renderer.info` read outside a draw flickers to zero
- Area: runtime · Severity: docs
- Context: The benchmark pane's draw-call counter.
- What happened: The pane read `renderer.info.render.drawCalls` from its own `requestAnimationFrame` loop. Three.js resets those counters at the start of every animation-loop tick, including ticks the runtime's `maxFps` cap skips, so the pane alternated between 0 and the real count.
- Workaround used: `main.ts` latches the count on the renderer's `"draw"` event, as the runtime's `RendererMetrics` does.
- Suggestion: Say in the renderer docs that `info` is only valid inside a `"draw"` handler, and point to the `renderer` metrics group in `runtime.metrics`.

## Summary

| Subject | Entries | Severity |
|---|---|---|
| Post-processing and render strategies | F-13, F-16, F-15 | missing-feature, perf, friction |
| Meshing and scale | F-19, F-11, F-12 | perf, missing-feature, missing-feature |
| World writes | F-18 | perf |
| Camera and runtime API | F-14, F-17 | friction, docs |

## Benchmark results

Runs used `tests/benchmark.mjs` in headless Chrome at 1440 × 900 on the local machine with seed 1337: a 32 px atlas, the platform with its giant tree, the viaduct and the seven-tier pyramid, with baked ambient occlusion, distant-tile averaging, and every voxel written through one `world.transaction()`. The live pane remains the source for measurements on a given machine.

| Scenario | Voxels | Chunks | Triangles | Draw calls | Write | Mesh | Frame |
|---|---:|---:|---:|---:|---:|---:|---:|
| Greedy on, shadows on, 1 copy | 285,028 | 227 | 332,127 | 728 | 261 ms | 254 ms | 3.9 ms |
| Greedy off, shadows on, 1 copy | 285,028 | 227 | 424,380 | 728 | 251 ms | 297 ms | 4.4 ms |
| Greedy on, shadows off, 1 copy | 285,028 | 227 | 332,127 | 371 | 268 ms | 365 ms | 2.6 ms |
| Greedy on, shadows on, 4 copies | 1,139,184 | 896 | 1,336,844 | 1,915 | 887 ms | 1,142 ms | 10 ms |

All four runs held 60 fps. These runs predate the giant tree, which adds a few thousand voxels.

## What worked well

- The `VoxelRenderer` actor component plugged into the runtime and camera lifecycle without extra scene wiring, and forwards every engine option.
- The fixes for F-01 to F-10 each replaced a demo workaround with a one-line option: `castShadow`, `materialGroup`, `ambientOcclusion`, `tileMinification`, `transaction()` and `camera.postProcessing`.
- Named layers made terrain, structure and garden visibility easy to inspect.
- The engine inspector exposed useful chunk and mesh counts for the benchmark pane.
