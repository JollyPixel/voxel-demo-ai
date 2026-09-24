// Import Third-party Dependencies
import { zipSync } from "fflate";
import {
  createPixelArtDocument,
  encodePixelArtDocument
} from "@jolly-pixel/pixel-draw.renderer";
import {
  encodeVoxelDocument,
  type TilesetDefinition,
  type VoxelWorldJSON
} from "@jolly-pixel/voxel.renderer";

// CONSTANTS
/**
 * What the voxel-map editor accepts. None of it is exported by the editor
 * packages, so the values are copied from their sources (see FEEDBACK.md).
 */
export const EDITOR_TARGET = {
  /**
   * `editors/voxel-map/vite.config.ts` and `src/boot/offlineWorkspace.ts`
   * build `voxelMapAssetKind({ chunkSize: 16 })`, and a world refuses a
   * document of another chunk size.
   */
  chunkSize: 16,
  /**
   * `DEFAULT_ARCHIVE_MAX_ENTRY_BYTES` / `DEFAULT_ARCHIVE_MAX_BYTES` of
   * `asset-server/src/archive/AssetArchive.ts`, checked on decoded sizes.
   */
  maxEntryBytes: 16 * 1024 * 1024,
  maxBytes: 64 * 1024 * 1024
} as const;

/**
 * Registered kind names: `VOXEL_MAP_KIND` and `PIXEL_ART_KIND` of the asset
 * packages, not the `voxel-map` / `pixel-art` spelling of the archive docs.
 */
const kVoxelMapKind = "voxelmap";
const kPixelArtKind = "pixelart";
const kManifestPath = "bundle.json";

export interface EditorArchiveTileset {
  /**
   * Tileset id the blocks' tile references point to.
   */
  id: string;
  tileSize: number;
  atlas: Pick<ImageData, "width" | "height" | "data">;
}

export interface EditorArchiveOptions {
  /**
   * Output of `VoxelEngine.save()`.
   */
  world: VoxelWorldJSON;
  tileset: EditorArchiveTileset;
  /**
   * File stem and id prefix of both assets inside the workspace. Keep it
   * stable, so importing a new export with "replace" updates the assets of
   * the previous one instead of piling up copies.
   */
  name: string;
}

export interface EditorArchive {
  bytes: Uint8Array<ArrayBuffer>;
  /**
   * Decoded size of each archive entry, by path.
   */
  entries: Record<string, number>;
}

export class EditorArchiveError extends Error {}

/**
 * Packs a saved world and its atlas as a `.zip` the voxel-map editor imports
 * from Map Config: a `.voxelmap.json` root, the atlas as a `.pixelart` asset
 * it references, and the `bundle.json` manifest.
 */
export function createEditorArchive(
  options: EditorArchiveOptions
): EditorArchive {
  const { world, tileset, name } = options;
  const mapId = `${name}-map`;
  const tilesetId = `${name}-tileset`;
  const mapPath = `maps/${name}.voxelmap.json`;
  const tilesetPath = `textures/${name}.pixelart`;

  if (!world.tilesets.some(({ id }) => id === tileset.id)) {
    throw new EditorArchiveError(`world has no tileset "${tileset.id}"`);
  }

  const { width, height, data } = tileset.atlas;
  const files: Record<string, Uint8Array> = {
    [tilesetPath]: encodePixelArtDocument(
      createPixelArtDocument({ x: width, y: height }, data)
    ),
    [mapPath]: encodeVoxelDocument({
      ...world,
      // Voxel keys are layer coordinates; only the target world's chunk size matters.
      chunkSize: EDITOR_TARGET.chunkSize,
      tilesets: world.tilesets.map((definition) => (definition.id === tileset.id ?
        linkedTileset(definition, tilesetId) :
        definition))
    }),
    [kManifestPath]: new TextEncoder().encode(JSON.stringify({
      version: 1,
      root: { id: mapId, kind: kVoxelMapKind },
      // Dependencies first, root last: import follows this order.
      assets: [
        { id: tilesetId, kind: kPixelArtKind, path: tilesetPath },
        { id: mapId, kind: kVoxelMapKind, path: mapPath }
      ]
    }, null, 2))
  };

  const entries = Object.fromEntries(
    Object.entries(files).map(([path, bytes]) => [path, bytes.byteLength])
  );
  checkLimits(entries);

  return {
    // fflate allocates the output, so it never views a SharedArrayBuffer.
    bytes: zipSync(files) as Uint8Array<ArrayBuffer>,
    entries
  };
}

/**
 * The editor reads a tileset's pixels from the catalog asset named by
 * `asset` and ignores `src`. `cols` and `rows` are dropped so they follow the
 * pixel document if it is resized in the editor.
 */
function linkedTileset(
  definition: TilesetDefinition,
  assetId: string
): TilesetDefinition {
  return {
    id: definition.id,
    asset: { id: assetId, kind: kPixelArtKind },
    tileSize: definition.tileSize
  };
}

function checkLimits(
  entries: Record<string, number>
): void {
  let total = 0;
  for (const [path, size] of Object.entries(entries)) {
    total += size;
    if (size > EDITOR_TARGET.maxEntryBytes) {
      throw new EditorArchiveError(
        `${path} is ${mebibytes(size)} MiB; the editor refuses entries over ${mebibytes(EDITOR_TARGET.maxEntryBytes)} MiB`
      );
    }
  }
  if (total > EDITOR_TARGET.maxBytes) {
    throw new EditorArchiveError(
      `archive is ${mebibytes(total)} MiB decoded; the editor refuses over ${mebibytes(EDITOR_TARGET.maxBytes)} MiB`
    );
  }
}

function mebibytes(
  bytes: number
): string {
  return (bytes / 1048576).toFixed(1);
}
