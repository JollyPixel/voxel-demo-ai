// Import Third-party Dependencies
import type {
  BlockDefinition,
  BlockShapeID,
  FaceSlotName,
  MaterialGroupJSON,
  ResolvedTilesetDefinition,
  TileRef
} from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import type {
  FaceSlot,
  MaterialSpec,
  SurfaceFinish
} from "./materials.ts";
import {
  TILE_SIZE,
  TileCanvas,
  type TilePainter
} from "./painters/tile.ts";

// CONSTANTS
const kAtlasCols = 8;
const kSideSlots: readonly FaceSlotName[] = ["right", "left", "front", "back"];

/**
 * A placeable block: the registry ids of its interchangeable tiles, one per
 * alternate.
 */
export interface Block {
  readonly ids: readonly number[];
}

type FaceTextures = Partial<Record<FaceSlotName, TileRef>>;
type VariantsOf<Spec> = Spec extends { variants: readonly (infer Shape extends string)[]; } ? Shape : never;
export type MaterialBlocks<Materials extends Record<string, MaterialSpec>> = {
  readonly [Key in keyof Materials]: Block & {
    readonly [Shape in VariantsOf<Materials[Key]>]: Block
  };
};

export interface Tileset {
  definition: ResolvedTilesetDefinition;
  blocks: BlockDefinition[];
  /**
   * The painted atlas as RGBA8, for exporters that cannot read the data URL.
   */
  atlas: ImageData;
}

export interface BlockSetOptions {
  tilesetId: string;
  /**
   * Finish of each material group, by group name. Every `group` a material
   * names needs one.
   */
  finishes?: Record<string, SurfaceFinish>;
}

export interface BlockSet<
  Materials extends Record<string, MaterialSpec> = Record<string, MaterialSpec>
> {
  /**
   * Block handles by material, e.g. `B.gold` or `B.sandstone.stair`.
   */
  readonly B: MaterialBlocks<Materials>;
  readonly definitions: readonly BlockDefinition[];
  /**
   * The finishes as document material groups, saved with the world.
   */
  readonly materialGroups: readonly MaterialGroupJSON[];
  createTileset: () => Tileset;
}

/**
 * Gives every material one block per alternate tile in its base shape, plus
 * one block per shape variant, and collects the tiles to paint.
 */
export function defineBlocks<
  const Materials extends Record<string, MaterialSpec>
>(
  materials: Materials,
  options: BlockSetOptions
): BlockSet<Materials> {
  const { tilesetId, finishes = {} } = options;
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
      defaultTilesetId: tilesetId,
      faceTextures,
      collidable: !spec.cutout,
      ...(spec.cutout ? { alphaMode: "mask" as const } : {}),
      ...(spec.group ? { materialGroup: spec.group } : {})
    });

    return id;
  }

  for (const [key, spec] of Object.entries(materials) as [string, MaterialSpec][]) {
    if (spec.group !== undefined && !Object.hasOwn(finishes, spec.group)) {
      throw new Error(`blocks: material "${key}" names group "${spec.group}", which has no finish`);
    }
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
      { ids: [define(spec, `${spec.name} ${shape}`, shape, mainTiles[0], faceTextures)] }
    ]);
    blocks[key] = { ids, ...Object.fromEntries(variants) };
  }

  return {
    B: blocks as unknown as MaterialBlocks<Materials>,
    definitions,
    materialGroups: Object.entries(finishes).map(([id, finish]) => {
      return { id, ...finish };
    }),
    createTileset() {
      return paintTileset(tilesetId, tiles, definitions);
    }
  };
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

/**
 * Paints every tile and lays them out in one atlas, handed over as a data
 * URL so the demo ships no image asset.
 */
function paintTileset(
  tilesetId: string,
  tiles: readonly TilePainter[],
  definitions: BlockDefinition[]
): Tileset {
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
      id: tilesetId,
      src: canvas.toDataURL("image/png"),
      tileSize: TILE_SIZE,
      cols: kAtlasCols,
      rows
    },
    blocks: definitions,
    atlas: context.getImageData(0, 0, canvas.width, canvas.height)
  };
}

/**
 * One of `block`'s alternate tiles as a block of its own, so a builder can
 * keep neighbouring voxels on the same tile and let their faces merge.
 */
export function alternateOf(
  block: Block,
  index: number
): Block {
  const { ids } = block;

  return { ids: [ids[((index % ids.length) + ids.length) % ids.length]] };
}
