# Voxel renderer feedback

Issues found while building the Floating Tomb and the Valley Shrine, grouped by subject. The demo works around engine limitations locally; the editor packages remain unchanged. Entries fixed upstream move to [Resolved](#resolved) and keep their number.

Measurements are from headless Chrome on the test machine (24 cores), production build, unless an entry says otherwise. The Valley Shrine has 565k voxels and, since vertex pulling replaced greedy meshing, 2.48M triangles (1.19M when F-4 and F-5 were first measured).

## Post-processing

### [F-2] Post-processing passes render at canvas size in a viewport
- Area: rendering · Severity: perf
- Context: Reviewing `camera.postProcessing` for split-screen cameras.
- What happened: `pass()` sizes its targets from the drawing buffer, not the camera's viewport. A half-screen camera renders a full-canvas pass, then the pipeline squeezes it into its viewport. The result is correct but costs about twice the fill rate per camera. Still the case after #791: the renderer docs say "Pass targets follow the canvas size, not the viewport size", `OffscreenCameraPipeline` sizes its new target from `getDrawingBufferSize()`, and `VoxelTransparencyPassNode` follows the drawing buffer too. `PostProcessingContext` still carries only `renderer`, `scene` and `camera`. Drawing inside a viewport has not been checked on a GPU yet; the demo only uses a full-canvas camera.
- Workaround used: None needed.
- Suggestion: Pass the camera's viewport in `PostProcessingContext`, so a pipeline can size its passes with `PassNode.setViewport` or `setResolutionScale`, and size the offscreen target from the viewport. Since F-1 the caller builds the scene pass, so the engine no longer has to.

## Lighting

### [F-5] The sun's shadow map is redrawn every frame for a static world
- Area: rendering · Severity: perf
- Context: A voxel world whose chunks and sun never move.
- What happened: The shadow pass drew every chunk into the 4096² map each frame. In the valley view it took the frame from 3 ms to 15.6 ms (19 fps) and doubled the draw calls: 1,278 against 449. The new `VoxelView.meshVersion` fixes most of this: it counts chunk meshes added, removed, culled, shown again or given another material. It also counts the material swaps of `range.farDistance`, which leave the shadow unchanged. Flying across the valley with the default 8 flat-tile chunks redraws the map about 1.5 times a second; with `?far=0` it is drawn once. Frame rate held at 58–60 fps either way on this machine.
- Workaround used: `shadow.autoUpdate = false`. `Lighting.update()` runs each frame and asks for a redraw when `meshVersion` changed and `pendingRebuilds` is 0, so view-distance culling no longer leaves the map stale.
- Suggestion: A counter for the changes a shadow map sees (geometry and visibility, not materials), or a `staticShadows` lighting option that keeps the map current itself.

### [F-15] Block light slows a worker build far more than a flush
- Area: view · Severity: perf
- Context: Giving the Valley Shrine's paper-lantern group a `lightLevel` of 9, 3 runs each.
- What happened: Time to `whenIdle()` with mesh workers went from 0.93–0.96 s to 1.51–1.68 s. With `flush()` on the main thread it went from 0.36–0.44 s to 0.51–0.55 s. The light also added 145 textures (853 to 998). Frame time did not change. In daylight the lanterns' light was barely visible. On the Floating Tomb, four braziers at level 12 add about 40 ms to a flush and 72 textures.
- Workaround used: The shrine's lanterns keep their emissive finish without a `lightLevel`. The tomb's braziers keep theirs: they replace four point lights (F-4).
- Suggestion: Compute block light next to the mesh workers, or say in the docs what it costs a worker build. Exposing the light texture count in `inspector` would help hosts budget it.

## Meshing and scale

### [F-12] The first build ignores the view distance
- Area: view · Severity: friction
- Context: Building the world, then calling `view.flush()` before the first frame.
- What happened: `VoxelRenderer` copies its `focus` object's position into `view.focus` only in `update()`, and `awake()` has already queued every chunk with a `null` focus. A null focus means an unbounded view, so a pre-loop `flush()` meshes chunks that `range.viewDistance` would hide, and workers get chunks in no particular order instead of nearest first. Since greedy meshing and LOD were removed (#803) nothing is remeshed afterwards, so the cost is wasted work, not the burst of half-resolution rebuilds measured before.
- Workaround used: `runWorld` sets `view.focus` from the camera's world position before `flush()`.
- Suggestion: Sample the focus in `VoxelRenderer.awake()` or at the start of `view.flush()`, or document that a pre-loop flush needs `view.focus`.

### [F-13] A worker build cannot finish as fast as a flush
- Area: view · Severity: perf
- Context: Building with mesh workers (`?workers=`, 4 by default here) and waiting for `whenIdle()` while the frame loop ticks, against `?workers=0`, which calls `flush()`. 3 runs each. "Mesh" is the time to `whenIdle()`.
- What happened: One Valley Shrine meshes in 0.39–0.56 s with `flush()` and in 0.88–0.96 s with workers. Four copies mesh in 1.24–2.02 s with `flush()` and in 0.95–0.99 s with workers. Workers win on big builds, but on one copy they take about twice as long as a flush to finish. `flush()` still reclaims every in-flight worker job and meshes on the main thread.
- Workaround used: The demo keeps `flush()` for `?workers=0` and defaults to `min(4, cores - 1)` workers. It checks `crossOriginIsolated` itself to report the worker count, because the view does not say whether workers are running or have fallen back.
- Suggestion: Let a build use workers without the per-tick budget, for example `await view.flushAsync()`. A read-only worker status (active count, fallen back, broken) would help hosts and benchmarks.

## Voxel-map editor interop

The pane's **Export .zip** button (`src/core/export/editorArchive.ts`) packs the world for the editor's Map Config import: a version 5 map and the `.blockset.json` asset it links, which holds the atlas pixels, tile size, blocks and material groups. The seed-1337 Valley Shrine (565,254 voxels, 109 blocks) comes to a 0.44 MiB zip: a 1.9 MiB map and a 0.4 MiB blockset, decoded. The exporter mirrors the voxel-map editor's `WORLD_BACKEND_TUNING` limits (64 MiB per entry, 128 MiB in total, now in `boot/defaultSeed.ts`), which the editor package does not export. The archives of all three worlds pass the editor's `readAssetArchive` with those limits, and each asset loads through the `voxelmap` and `blockset` kind handlers of `@jolly-pixel/asset.voxel-map`. The Floating Tomb's merged brazier cells and its `fire` group's `lightLevel` come through. The export has not been opened in the editor UI yet.

### [F-10] No browser-safe way to write an archive or name the asset kinds
- Area: asset-server · Severity: missing-feature
- Context: Producing an importable `.zip` from a page with no asset back-end.
- What happened: `exportAssetArchive` needs a back-end. Writing one directly means hand-building `bundle.json` and the blockset's `BlocksetAssetDocument`, and repeating `VOXEL_MAP_KIND`, `BLOCKSET_KIND`, `BLOCKSET_DOCUMENT_VERSION` and `ASSET_ARCHIVE_MANIFEST_PATH`. The asset packages are workspace-private. The tileset-to-blockset rename showed the cost: the kind name, file extension and folder all changed, and the demo's copies had to follow by hand.
- Workaround used: `editorArchive.ts` writes the manifest and the blockset document (through the renderer's `BlocksetDocument`) and zips with `fflate`, with the kind names and document version copied into the demo.
- Suggestion: A pure `writeAssetArchive({ root, assets })` beside `readAssetArchive`, and the kind constants, `blocksetAsset()` and `createBlocksetDocument()` exported from a browser-safe entry point once the asset packages are published.

### [F-11] The editor ignores a blockset's `src`
- Area: editor · Severity: friction
- Context: The demo's blockset is a painted atlas passed as a data URL in `src`.
- What happened: The editor resolves a blockset only through `definition.asset.id` (`features/blocksets/BlocksetEntry.ts`). Maps store no blocks, so a map whose blocksets use `src` opens with every blockset unlinked and no blocks, and nothing offers to convert them.
- Workaround used: The exporter writes the atlas and blocks as a `.blockset.json` asset and replaces `src` with an `asset` reference in slot 0.
- Suggestion: On open or import, offer to turn a `src` image (URL or data URL) into a blockset asset, the same way the seed turns a PNG into one with `blocksetDocumentFromPng`.

## Resolved

### [F-4] Every point light costs every pixel of the frame
- Area: rendering · Severity: perf
- Context: The Valley Shrine first lit 16 of its lanterns with point lights of 20 voxels' reach.
- What happened: The overview dropped to 11–15 fps with 22–25 ms frames. With no point lights it ran at 60 fps with 9 ms frames. At ground level in the garden, 4 lights gave 14.4 ms frames and none gave 7 ms. The forward renderer evaluates every light for every fragment of every lit material, however far away it is.
- Resolution: Block light (#917). A material group's `lightLevel` lights nearby blocks on the CPU, so it costs no per-pixel work. The Floating Tomb's four braziers now light the interior this way, and the demo has no point lights left. Lit, the tomb renders in 1.5–1.7 ms frames at 60 fps from the interior view. The build cost is in F-15.

## Summary

| Subject | Entries | Severity |
|---|---|---|
| Post-processing | F-2 | perf |
| Lighting | F-5, F-15 | perf, perf |
| Meshing and scale | F-12, F-13 | friction, perf |
| Voxel-map editor interop | F-10, F-11 | missing-feature, friction |
| Resolved | F-4 | perf |
