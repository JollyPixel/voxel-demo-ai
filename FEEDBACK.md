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
- Workaround used: `runWorld` sets `shadow.autoUpdate = false` and asks for one redraw once `engine.whenIdle()` resolves, after the build and after each pane toggle that rebuilds chunks. The valley view now runs at 60 fps with 3.6 ms frames and shadows on. A rebuild the demo does not trigger itself leaves the map stale: chunks that `ViewDistance` shows or hides as the camera moves, and chunks that cross `lodDistance` and are remeshed at the other resolution.
- Suggestion: An engine event when chunk meshes change (built, rebuilt, shown or hidden), so a host can keep a static shadow map current without guessing. Optionally a `staticShadows` option on `VoxelRenderer` that does this itself.

## Meshing and scale

### [F-12] The first build ignores view and detail distances
- Area: view · Severity: friction
- Context: Building the world, then calling `engine.flush()` before the first frame, with `lodDistance` set.
- What happened: `VoxelRenderer` copies its `focus` object's position into `engine.focus` only in `update()`. Until the first update `engine.focus` is `null`, and a null focus means unbounded, full-detail chunks. The demo's `flush()` therefore meshed all four Valley Shrine copies at full resolution (4.28M triangles), and the first frames then remeshed the distant chunks at half resolution: about three seconds of 15–33 ms frames before settling at 9 ms. `ViewDistance` has the same gap: hidden chunks get meshed.
- Workaround used: `runWorld` sets `engine.focus` from the camera's world position before `flush()`. The build now meshes at 2.89M triangles directly, with no burst after load.
- Suggestion: Sample the focus in `VoxelRenderer.awake()` or at the start of `engine.flush()`, or document that a pre-loop flush needs `engine.focus`.

## Voxel-map editor interop

The pane's **Export .zip** button (`src/core/export/editorArchive.ts`) packs the world for the editor's Map Config import: a version 2 map and the `.tileset.json` asset it links, which holds the atlas pixels, tile size, blocks and material groups. The seed-1337 Valley Shrine (565,254 voxels, 109 blocks) comes to a 2.5 MiB zip: a 21.5 MiB map and a 0.4 MiB tileset, decoded. `importAssetArchive` accepts the archive with the voxel-map editor's kind handlers (`tileset`, `voxelmap`, `texture`), and the block sets of all three worlds pass its `decodeTilesetDocument`. The version 2 export has not been opened in the editor UI yet.

### [F-9] Voxel JSON uses about 40 bytes per voxel
- Area: asset-server · Severity: friction
- Context: Checking that the export fits before downloading.
- What happened: The map entry stores each voxel as `"x,y,z":{"block":n,"transform":n}`, about 40 bytes. One copy of the Valley Shrine (565,254 voxels) makes a 21.5 MiB map entry that zips to 2.5 MiB. It now fits under the voxel-map editor's 64 MiB entry limit, but three copies would not, and the whole entry is decoded and parsed on import.
- Workaround used: The exporter mirrors the voxel-map editor's `WORLD_BACKEND_TUNING` limits, which the editor package does not export, and refuses early with a message naming the entry and its size.
- Suggestion: A compact voxel encoding (per-layer packed position and voxel arrays, base64 like `.pixelart`) would shrink maps several times, whatever the limit.

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
| Meshing and scale | F-12 | friction |
| Voxel-map editor interop | F-9, F-10, F-11 | friction, missing-feature, friction |
