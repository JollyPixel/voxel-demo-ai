// Import Third-party Dependencies
import { zipSync } from "fflate";
import {
  createPixelArtDocument,
  type PixelArtDocumentData
} from "@jolly-pixel/pixel-draw.renderer";
import {
  encodeVoxelDocument,
  TilesetDocument,
  type BlockDefinition,
  type MaterialGroupJSON,
  type TilesetDefinition,
  type TilesetDocumentJSON,
  type VoxelWorldJSON
} from "@jolly-pixel/voxel.renderer";

/**
 * Decoded size caps of an archive, in bytes: the asset server's
 * `ArchiveLimits`.
 */
export interface ArchiveLimits {
  maxEntryBytes: number;
  maxBytes: number;
}

// CONSTANTS
const kMiB = 1024 * 1024;

/**
 * Decoded sizes the voxel-map editor's import accepts: the
 * `catalogArchiveLimits` of its `WORLD_BACKEND_TUNING`
 * (`editors/voxel-map/src/boot/worldProject.ts`), which the editor package
 * does not export.
 */
export const EDITOR_ARCHIVE_LIMITS: Readonly<ArchiveLimits> = {
  maxEntryBytes: 64 * kMiB,
  maxBytes: 128 * kMiB
};

/**
 * Registered kind names and the tileset document version: `VOXEL_MAP_KIND`,
 * `TILESET_KIND` and `TILESET_DOCUMENT_VERSION` of the asset packages.
 */
const kVoxelMapKind = "voxelmap";
const kTilesetKind = "tileset";
const kTilesetDocumentVersion = 1;
const kManifestPath = "bundle.json";

/**
 * Slot the exported tileset takes in the map. The demo registers its blocks
 * under their local ids, which are the world ids of slot 0.
 */
const kTilesetSlot = 0;

export interface EditorArchiveTileset {
  /**
   * Tileset id the blocks' tile references point to.
   */
  id: string;
  tileSize: number;
  atlas: Pick<ImageData, "width" | "height" | "data">;
  blocks: Iterable<BlockDefinition>;
  materialGroups: Iterable<MaterialGroupJSON>;
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
  /**
   * @default EDITOR_ARCHIVE_LIMITS
   */
  limits?: Readonly<ArchiveLimits>;
}

export interface EditorArchive {
  bytes: Uint8Array<ArrayBuffer>;
  /**
   * Decoded size of each archive entry, by path.
   */
  entries: Record<string, number>;
}

/**
 * A `.tileset.json` asset: the voxel-map editor's `TilesetAssetDocument`.
 */
interface TilesetAssetDocument extends TilesetDocumentJSON {
  version: typeof kTilesetDocumentVersion;
  pixels: PixelArtDocumentData;
}

export class EditorArchiveError extends Error {}

/**
 * Packs a saved world and its blocks as a `.zip` the voxel-map editor imports
 * from Map Config: a `.voxelmap.json` root, the `.tileset.json` asset it
 * links (atlas pixels, tile size, blocks and material groups), and the
 * `bundle.json` manifest.
 */
export function createEditorArchive(
  options: EditorArchiveOptions
): EditorArchive {
  const { world, tileset, name, limits = EDITOR_ARCHIVE_LIMITS } = options;
  const mapId = `${name}-map`;
  const tilesetId = `${name}-tileset`;
  const mapPath = `maps/${name}.voxelmap.json`;
  const tilesetPath = `tilesets/${name}.tileset.json`;

  if (!world.tilesets.some(({ id }) => id === tileset.id)) {
    throw new EditorArchiveError(`world has no tileset "${tileset.id}"`);
  }

  const files: Record<string, Uint8Array> = {
    [tilesetPath]: encodeJSON(tilesetAssetDocument(tileset)),
    // The editor re-partitions a document of another chunk size on load.
    [mapPath]: encodeVoxelDocument({
      ...world,
      tilesets: world.tilesets.map((definition) => (definition.id === tileset.id ?
        linkedTileset(definition, tilesetId) :
        definition))
    }),
    [kManifestPath]: new TextEncoder().encode(JSON.stringify({
      version: 1,
      root: { id: mapId, kind: kVoxelMapKind },
      // Dependencies first, root last: import follows this order.
      assets: [
        { id: tilesetId, kind: kTilesetKind, path: tilesetPath },
        { id: mapId, kind: kVoxelMapKind, path: mapPath }
      ]
    }, null, 2))
  };

  const entries = Object.fromEntries(
    Object.entries(files).map(([path, bytes]) => [path, bytes.byteLength])
  );
  checkLimits(entries, limits);

  return {
    // fflate allocates the output, so it never views a SharedArrayBuffer.
    bytes: zipSync(files) as Uint8Array<ArrayBuffer>,
    entries
  };
}

/**
 * The stored form of a tileset asset. `TilesetDocument` makes the blocks
 * tileset-local: their tile references name no tileset, and the editor
 * projects them into the map's slot on load.
 */
function tilesetAssetDocument(
  { tileSize, atlas, blocks, materialGroups }: EditorArchiveTileset
): TilesetAssetDocument {
  const { width, height, data } = atlas;
  const document = new TilesetDocument({ tileSize, blocks, materialGroups });

  return {
    version: kTilesetDocumentVersion,
    pixels: createPixelArtDocument({ x: width, y: height }, data),
    ...document.toJSON()
  };
}

/**
 * The editor reads a tileset's pixels, tile size and blocks from the catalog
 * asset named by `asset`, so the link keeps only its id and slot.
 */
function linkedTileset(
  definition: TilesetDefinition,
  assetId: string
): TilesetDefinition {
  return {
    id: definition.id,
    slot: kTilesetSlot,
    asset: { id: assetId, kind: kTilesetKind }
  };
}

function encodeJSON(
  value: unknown
): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function checkLimits(
  entries: Record<string, number>,
  { maxEntryBytes, maxBytes }: Readonly<ArchiveLimits>
): void {
  let total = 0;
  for (const [path, size] of Object.entries(entries)) {
    total += size;
    if (size > maxEntryBytes) {
      throw new EditorArchiveError(
        `${path} is ${mebibytes(size)} MiB; the editor refuses entries over ${mebibytes(maxEntryBytes)} MiB`
      );
    }
  }
  if (total > maxBytes) {
    throw new EditorArchiveError(
      `archive is ${mebibytes(total)} MiB decoded; the editor refuses over ${mebibytes(maxBytes)} MiB`
    );
  }
}

function mebibytes(
  bytes: number
): string {
  return (bytes / kMiB).toFixed(1);
}
