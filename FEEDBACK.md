# Voxel renderer feedback

Issues found while building the Floating Tomb and the Valley Shrine, grouped by subject. The demo works around engine limitations locally; the editor packages remain unchanged. Entries fixed upstream move to [Resolved](#resolved) and keep their number.

## Post-processing

### [F-2] Post-processing passes render at canvas size in a viewport
- Area: rendering · Severity: perf
- Context: Reviewing `camera.postProcessing` for split-screen cameras.
- What happened: `pass()` sizes its targets from the drawing buffer, not the camera's viewport. A half-screen camera renders a full-canvas pass, then the pipeline squeezes it into its viewport. The result is correct but costs about twice the fill rate per camera. Still the case after #791: the renderer docs say "Pass targets follow the canvas size, not the viewport size", `OffscreenCameraPipeline` sizes its new target from `getDrawingBufferSize()`, and `VoxelTransparencyPassNode` follows the drawing buffer too. Drawing inside a viewport has not been checked on a GPU yet; the demo only uses a full-canvas camera.
- Workaround used: None needed.
- Suggestion: Pass the camera's viewport in `PostProcessingContext`, so a pipeline can size its passes with `PassNode.setViewport` or `setResolutionScale`, and size the offscreen target from the viewport. Since F-1 the caller builds the scene pass, so the engine no longer has to.

## Lighting

Measured in headless Chrome on the test machine, on the Valley Shrine (565k voxels, 1.19M triangles). Frame times are the pane's CPU frame time; fps is the rate the page reached.

### [F-4] Every point light costs every pixel of the frame
- Area: rendering · Severity: perf
- Context: The Valley Shrine first lit 16 of its lanterns with point lights of 20 voxels' reach.
- What happened: The overview dropped to 11–15 fps with 22–25 ms frames. With no point lights it ran at 60 fps with 9 ms frames. At ground level in the garden, 4 lights gave 14.4 ms frames and none gave 7 ms. The forward renderer evaluates every light for every fragment of every lit material, however far away it is.
- Workaround used: No point lights in the valley. The lantern paper takes an emissive material-group finish (`emissive`, `emissiveIntensity`), which travels with the document. The Floating Tomb keeps its few braziers.
- Suggestion: Tiled or clustered light culling (three.js ships `TiledLighting` for the WebGPU renderer), or at least a note in the docs next to point lights. An emissive finish is already the right tool for glowing blocks; the docs could point to it.

### [F-5] The sun's shadow map is redrawn every frame for a static world
- Area: rendering · Severity: perf
- Context: A voxel world whose chunks and sun never move.
- What happened: The shadow pass drew every chunk into the 4096² map each frame. In the valley view it took the frame from 3 ms to 15.6 ms (19 fps). It also doubled the draw calls: 1,278 against 449.
- Workaround used: `runWorld` sets `shadow.autoUpdate = false` and asks for one redraw once `view.whenIdle()` resolves, after the build and after each pane toggle that rebuilds chunks. The valley view now runs at 60 fps with 3.6 ms frames and shadows on. A rebuild the demo does not trigger itself leaves the map stale, such as chunks that `ViewDistance` shows or hides as the camera moves. The noise-world example listens for `childadded`/`childremoved` on the view's internal `VoxelView:chunks` group instead, but that relies on an internal name and misses hidden chunks, which only flip `mesh.visible`.
- Suggestion: An engine event when chunk meshes change (built, rebuilt, shown or hidden), so a host can keep a static shadow map current without guessing. Optionally a `staticShadows` lighting option that does this itself.

## Meshing and scale

### [F-12] The first build ignores the view distance
- Area: view · Severity: friction
- Context: Building the world, then calling `view.flush()` before the first frame.
- What happened: `VoxelRenderer` copies its `focus` object's position into `view.focus` only in `update()`, and `awake()` has already queued every chunk with a `null` focus. A null focus means an unbounded view, so a pre-loop `flush()` meshes chunks that `range.viewDistance` would hide, and workers get chunks in no particular order instead of nearest first. Since greedy meshing and LOD were removed (#803) nothing is remeshed afterwards, so the cost is wasted work, not the burst of half-resolution rebuilds measured before.
- Workaround used: `runWorld` sets `view.focus` from the camera's world position before `flush()`.
- Suggestion: Sample the focus in `VoxelRenderer.awake()` or at the start of `view.flush()`, or document that a pre-loop flush needs `view.focus`.

### [F-13] A worker build cannot finish as fast as a flush
- Area: view · Severity: perf
- Context: Building with mesh workers (`?workers=`, 4 by default here) and waiting for `whenIdle()` while the frame loop ticks, against `?workers=0`, which calls `flush()`. Production build, headless Chrome, 24 cores, 3 runs each. "Mesh" is the time to `whenIdle()`; the longest task also covers the voxel writes (about 0.26 s per Valley Shrine copy).
- What happened: Since LOD was removed, workers mesh every chunk, so the half-resolution tail measured before is gone. One Valley Shrine meshes in 0.44–0.50 s with `flush()` (longest task 0.79–0.89 s) and in 1.1–1.9 s with workers (longest task 0.37–0.49 s). Four copies mesh in 1.8–2.3 s with `flush()` (longest task 3.1–3.6 s) and in 1.0–1.7 s with workers (longest task 1.1–1.9 s). Workers therefore win outright on big builds, but on one copy they take two to four times longer than a flush to finish. `flush()` still reclaims every in-flight worker job and meshes on the main thread.
- Workaround used: The demo keeps `flush()` for `?workers=0` and defaults to `min(4, cores - 1)` workers. It checks `crossOriginIsolated` itself to report the worker count, because the view does not say whether workers are running or have fallen back.
- Suggestion: Let a build use workers without the per-tick budget, for example `await view.flushAsync()`. A read-only worker status (active count, fallen back, broken) would help hosts and benchmarks.

## Voxel-map editor interop

The pane's **Export .zip** button (`src/core/export/editorArchive.ts`) packs the world for the editor's Map Config import: a version 3 map and the `.tileset.json` asset it links, which holds the atlas pixels, tile size, blocks and material groups. The seed-1337 Valley Shrine (565,254 voxels, 109 blocks) comes to a 0.44 MiB zip: a 1.9 MiB map and a 0.4 MiB tileset, decoded. With the run-length encoded chunks of format version 3 (#805) the map entry is about 11 times smaller than the 21.5 MiB version 2 entry, which settles the old F-9. The exporter still mirrors the voxel-map editor's `WORLD_BACKEND_TUNING` limits (64 MiB per entry, 128 MiB in total), which the editor package does not export. The map decodes with `decodeVoxelWorld`, the decoder of the editor's `voxelmap` kind. `importAssetArchive` accepted the version 2 archive with the voxel-map editor's kind handlers (`tileset`, `voxelmap`, `texture`), and the block sets of all three worlds passed its `decodeTilesetDocument`; that check has not been re-run on version 3, and the export has not been opened in the editor UI yet.

### [F-10] No browser-safe way to write an archive or name the asset kinds
- Area: asset-server · Severity: missing-feature
- Context: Producing an importable `.zip` from a page with no asset back-end.
- What happened: `exportAssetArchive` needs a back-end. Writing one directly means hand-building `bundle.json` and the tileset's `TilesetAssetDocument`, and repeating `VOXEL_MAP_KIND`, `TILESET_KIND`, `TILESET_DOCUMENT_VERSION` and `ASSET_ARCHIVE_MANIFEST_PATH`. The asset packages are workspace-private.
- Workaround used: `editorArchive.ts` writes the manifest and the tileset document (through the renderer's `TilesetDocument`) and zips with `fflate`, with the kind names and document version copied into the demo. The result was checked against the editor's `readAssetArchive`, `importAssetArchive` and `decodeTilesetDocument`.
- Suggestion: A pure `writeAssetArchive({ root, assets })` beside `readAssetArchive`, and the kind constants, `tilesetAsset()` and `createTilesetDocument()` exported from a browser-safe entry point once the asset packages are published.

### [F-11] The editor ignores a tileset's `src`
- Area: editor · Severity: friction
- Context: The demo's tileset is a painted atlas passed as a data URL in `src`.
- What happened: The editor resolves a tileset only through `definition.asset.id` (`features/tilesets/tilesetEntries.ts`). Since version 2 maps store no blocks, a map whose tilesets use `src` opens with every tileset unlinked and no blocks, and nothing offers to convert them.
- Workaround used: The exporter writes the atlas and blocks as a `.tileset.json` asset and replaces `src` with an `asset` reference in slot 0.
- Suggestion: On open or import, offer to turn a `src` image (URL or data URL) into a tileset asset, the same way the seed turns `tileset.png` into one with `tilesetDocumentFromPng`.

## Summary

| Subject | Entries | Severity |
|---|---|---|
| Post-processing | F-2 | perf |
| Lighting | F-4, F-5 | perf, perf |
| Meshing and scale | F-12, F-13 | friction, perf |
| Voxel-map editor interop | F-10, F-11 | missing-feature, friction |
