// Import Third-party Dependencies
import type {
  BlockDefinition,
  BlockShapeID,
  FaceSlotName,
  TileRef,
  TilesetDefinition
} from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import {
  MATERIALS,
  type FaceSlot,
  type Layer,
  type MaterialKey,
  type MaterialSpec
} from "./materials.ts";
import {
  TILE_SIZE,
  TileCanvas,
  type TilePainter
} from "./painters/tile.ts";

export { LAYERS, surfaceFinish, type Layer } from "./materials.ts";

// CONSTANTS
const kTilesetId = "tomb";
const kAtlasCols = 8;
const kSideSlots: readonly FaceSlotName[] = ["right", "left", "front", "back"];

/**
 * A placeable block: the registry ids of its interchangeable tiles (one per
 * alternate) and the layer it is written to.
 */
export interface Block {
  readonly ids: readonly number[];
  readonly layer: Layer;
}

type FaceTextures = Partial<Record<FaceSlotName, TileRef>>;
type VariantsOf<Spec> = Spec extends { variants: readonly (infer Shape extends string)[]; } ? Shape : never;
type MaterialBlocks = {
  readonly [Key in MaterialKey]: Block & {
    readonly [Shape in VariantsOf<typeof MATERIALS[Key]>]: Block
  };
};

const { blocks, definitions, tiles } = registerBlocks();

/**
 * Block handles by material, e.g. `B.gold` or `B.sandstone.stair`.
 */
export const B = blocks;

/**
 * Gives every material one block per alternate tile in its base shape, plus
 * one block per shape variant, and collects the tiles to paint.
 */
function registerBlocks(): { blocks: MaterialBlocks; definitions: BlockDefinition[]; tiles: TilePainter[]; } {
  const definitions: BlockDefinition[] = [];
  const tiles: TilePainter[] = [];
  const blocks: Record<string, Block> = {};

  function allocateTile(painter: TilePainter): TileRef {
    tiles.push(painter);
    const index = tiles.length - 1;

    return [index % kAtlasCols, Math.floor(index / kAtlasCols)];
  }

  function define(spec: MaterialSpec, name: string, shapeId: BlockShapeID, tile: TileRef, faceTextures: FaceTextures): number {
    const id = definitions.length + 1;
    definitions.push({
      id,
      name,
      shapeId,
      defaultTexture: tile,
      defaultTilesetId: kTilesetId,
      faceTextures,
      collidable: !spec.cutout,
      ...(spec.cutout ? { alphaMode: "mask" as const } : {}),
      ...(spec.group ? { materialGroup: spec.group } : {})
    });

    return id;
  }

  for (const key of Object.keys(MATERIALS) as MaterialKey[]) {
    const spec: MaterialSpec = MATERIALS[key];
    const mainTiles = Array.from({ length: spec.alternates ?? 1 }, () => allocateTile(spec.tile));
    const faceTextures = allocateFaceTiles(spec, allocateTile);

    const ids = mainTiles.map((tile, index) => define(
      spec,
      index === 0 ? spec.name : `${spec.name} ${index + 1}`,
      "cube",
      tile,
      faceTextures
    ));
    const variants = (spec.variants ?? []).map((shape) => [
      shape,
      { ids: [define(spec, `${spec.name} ${shape}`, shape, mainTiles[0], faceTextures)], layer: spec.layer }
    ]);
    blocks[key] = { ids, layer: spec.layer, ...Object.fromEntries(variants) };
  }

  return { blocks: blocks as unknown as MaterialBlocks, definitions, tiles };
}

function allocateFaceTiles(
  spec: MaterialSpec,
  allocateTile: (painter: TilePainter) => TileRef
): FaceTextures {
  const faceTextures: FaceTextures = {};

  for (const [slot, painter] of Object.entries(spec.faces ?? {}) as [FaceSlot, TilePainter][]) {
    const tile = allocateTile(painter);
    for (const target of slot === "sides" ? kSideSlots : [slot]) {
      faceTextures[target] = tile;
    }
  }

  return faceTextures;
}

export interface Tileset {
  definition: TilesetDefinition;
  blocks: BlockDefinition[];
  /**
   * The painted atlas as RGBA8, for exporters that cannot read the data URL.
   */
  atlas: ImageData;
}

/**
 * Paints every tile and lays them out in one atlas, handed over as a data
 * URL so the demo ships no image asset.
 */
export function createTileset(): Tileset {
  const rows = Math.ceil(tiles.length / kAtlasCols);
  const canvas = document.createElement("canvas");
  canvas.width = kAtlasCols * TILE_SIZE;
  canvas.height = rows * TILE_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("blocks: unable to acquire a 2D canvas context");
  }
  for (const [index, paint] of tiles.entries()) {
    const tile = new TileCanvas(index * 7919 + 13);
    paint(tile);
    const x = (index % kAtlasCols) * TILE_SIZE;
    const y = Math.floor(index / kAtlasCols) * TILE_SIZE;
    context.putImageData(new ImageData(tile.pixels, TILE_SIZE, TILE_SIZE), x, y);
  }

  return {
    definition: {
      id: kTilesetId,
      src: canvas.toDataURL("image/png"),
      tileSize: TILE_SIZE,
      cols: kAtlasCols,
      rows
    },
    blocks: definitions,
    atlas: context.getImageData(0, 0, canvas.width, canvas.height)
  };
}
