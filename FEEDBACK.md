# Voxel renderer feedback

Open issues found while building the Floating Tomb, grouped by subject. The demo works around engine limitations locally; the editor packages remain unchanged.

Entries F-01 to F-10, F-14, F-20 and F-24 were fixed in the editor workspace and the demo now uses those APIs: chunk shadow flags, material groups, `VoxelWorld.transaction()`, the WebGPU shadow-map default, typed face slots, baked ambient occlusion, distant-tile averaging, `camera.postProcessing`, camera options on `OrbitFlyCamera`, documents of any chunk size, and the corrected archive and editor docs. The finish half of F-25 is fixed too: gold's finish is a document `materialGroups` entry. Fixed entries are removed from this list; git history keeps their write-ups. Numbers are kept stable, so the gaps are expected.

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

### [F-17] `renderer.info` read outside a draw flickers to zero
- Area: runtime · Severity: docs
- Context: The benchmark pane's draw-call counter.
- What happened: The pane read `renderer.info.render.drawCalls` from its own `requestAnimationFrame` loop. Three.js resets those counters at the start of every animation-loop tick, including ticks the runtime's `maxFps` cap skips, so the pane alternated between 0 and the real count.
- Workaround used: `main.ts` latches the count on the renderer's `"draw"` event, as the runtime's `RendererMetrics` does.
- Suggestion: Say in the renderer docs that `info` is only valid inside a `"draw"` handler, and point to the `renderer` metrics group in `runtime.metrics`.

## Voxel-map editor interop

The pane's **Export .zip** button (`src/export/editorArchive.ts`) packs the world for the editor's Map Config import. The seed-1337 scene (289,695 voxels, 71 blocks) came to a 1.2 MiB zip, 11.0 MiB decoded. `planAssetImport` and `importAssetArchive` accepted it with the editor's own kind handlers, and the offline editor rendered it textured with every block in the library.

### [F-21] Archive limits are fixed constants, and voxel JSON uses about 40 bytes per voxel
- Area: asset-server · Severity: friction
- Context: Checking that the export fits before downloading.
- What happened: `readAssetArchive` refuses an entry over 16 MiB or an archive over 64 MiB. Both limits apply to decoded sizes and cannot be set from the editor. The map entry is 11.0 MiB for one scene copy, about 40 bytes per voxel (`"x,y,z":{"block":n,"transform":n}`). `?copies=2` would already exceed the limit, although the zip compresses about 9×.
- Workaround used: The exporter repeats the constants and refuses early with a message naming the entry and its size.
- Suggestion: Make the limits editor configuration, and export `DEFAULT_ARCHIVE_MAX_*` from a browser-safe entry point. Longer term, a compact voxel encoding (per-layer packed position and voxel arrays, base64 like `.pixelart`) would shrink maps several times, whatever the limit.

### [F-22] No browser-safe way to write an archive or name the asset kinds
- Area: asset-server · Severity: missing-feature
- Context: Producing an importable `.zip` from a page with no asset back-end.
- What happened: `exportAssetArchive` needs a back-end. Writing one directly means hand-building `bundle.json` and repeating `VOXEL_MAP_KIND`, `PIXEL_ART_KIND` and `ASSET_ARCHIVE_MANIFEST_PATH`. The asset packages are workspace-private, and their root entry points import server dependencies.
- Workaround used: `editorArchive.ts` writes the manifest and zips with `fflate`, with the kind names copied into the demo. The result was checked against the editor's `readAssetArchive` and `planAssetImport`.
- Suggestion: A pure `writeAssetArchive({ root, assets })` beside `readAssetArchive`, and the kind constants plus `tilesetAsset()` exported from the client entry points once the asset packages are published.

### [F-23] The editor ignores a tileset's `src`
- Area: editor · Severity: friction
- Context: The demo's tileset is a painted atlas passed as a data URL in `src`.
- What happened: The editor resolves tileset pixels only through `definition.asset.id` (`features/tilesets/tilesetEntries.ts`). A map whose tilesets use `src` opens with every tileset unlinked and every block untextured, and nothing offers to convert them.
- Workaround used: The exporter encodes the atlas as a `.pixelart` asset and replaces `src` with an `asset` reference.
- Suggestion: On open or import, offer to turn a `src` image (URL or data URL) into a pixel-art asset, the same way the seed turns `tileset.png` into one with `createPixelBufferFromPng`.

### [F-25] Lights, water and sky do not travel with the map
- Area: blocks · Severity: missing-feature
- Context: Opening the export in the editor now that gold's finish is a document `materialGroups` entry.
- What happened: Material finishes travel with the map, but the demo's point lights, water surface and sky are host code, so the editor shows the map under its own lighting presets. Gold also looks dark there until **Reflections** is on, because the editor has no environment by default.
- Workaround used: None; accepted for editing.
- Suggestion: Point lights could be a known object type in `objectLayers`.

## Summary

| Subject | Entries | Severity |
|---|---|---|
| Post-processing and render strategies | F-13, F-16, F-15 | missing-feature, perf, friction |
| Meshing and scale | F-19, F-11, F-12 | perf, missing-feature, missing-feature |
| World writes | F-18 | perf |
| Camera and runtime API | F-17 | docs |
| Voxel-map editor interop | F-21, F-22, F-23, F-25 | friction, missing-feature, friction, missing-feature |
