// Import Third-party Dependencies
import type {
  BlockDefinition,
  BlockShapeID,
  TileRef,
  TilesetDefinition
} from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import {
  MATERIALS,
  type Layer,
  type MaterialKey,
  type MaterialSpec
} from "./materials.ts";
import {
  TILE_SIZE,
  TileCanvas,
  type TilePainter
} from "./painters/tile.ts";

export { crossShape } from "./crossShape.ts";
export { LAYERS, type Layer } from "./materials.ts";

// CONSTANTS
const kTilesetId = "tomb";
const kAtlasCols = 8;
const kSideSlots = ["right", "left", "front", "back"] as const;

/**
 * A placeable block: the registry ids of its interchangeable tiles (one per
 * alternate) and the layer it is written to.
 */
export interface Block {
  readonly ids: readonly number[];
  readonly layer: Layer;
}

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

  function define(spec: MaterialSpec, name: string, shapeId: BlockShapeID, tile: TileRef, faceTextures: Record<string, TileRef>): number {
    const id = definitions.length + 1;
    definitions.push({
      id,
      name,
      shapeId,
      defaultTexture: tile,
      defaultTilesetId: kTilesetId,
      faceTextures,
      collidable: !spec.cutout,
      ...(spec.cutout ? { alphaMode: "mask" as const } : {})
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
      spec.shape ?? "cube",
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
): Record<string, TileRef> {
  const faceTextures: Record<string, TileRef> = {};

  for (const [slot, painter] of Object.entries(spec.faces ?? {})) {
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
   * The same tiles laid out for mipmapping (see `PaddedAtlas`).
   */
  padded: PaddedAtlas;
}

/**
 * The atlas with every tile repeated 2×2 in a cell twice its size, offset
 * by half a tile. A cell thus shows the tile surrounded by its own wrapped
 * edges, and each mip level down to one texel per cell averages that tile
 * only, never its atlas neighbours.
 */
export interface PaddedAtlas {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
  tileSize: number;
  /**
   * Cell size in pixels: twice the tile size.
   */
  cellSize: number;
}

/**
 * Paints every tile once, then lays the tiles out twice: plainly for the
 * engine's tileset (handed over as a data URL, so the demo ships no image
 * asset) and padded for mipmapped sampling.
 */
export function createTileset(): Tileset {
  const rows = Math.ceil(tiles.length / kAtlasCols);
  const painted = tiles.map((paint, index) => {
    const tile = new TileCanvas(index * 7919 + 13);
    paint(tile);

    return new ImageData(tile.pixels, TILE_SIZE, TILE_SIZE);
  });

  return {
    definition: {
      id: kTilesetId,
      src: layOut(painted, rows, TILE_SIZE, [[0, 0]]).toDataURL("image/png"),
      tileSize: TILE_SIZE,
      cols: kAtlasCols,
      rows
    },
    blocks: definitions,
    padded: {
      canvas: layOut(painted, rows, TILE_SIZE * 2, kPaddedOffsets),
      cols: kAtlasCols,
      rows,
      tileSize: TILE_SIZE,
      cellSize: TILE_SIZE * 2
    }
  };
}

/*
 * Where the tile is stamped inside its padded cell: a 3×3 grid of copies
 * centred half a tile in, clipped by the cell, covers it seamlessly.
 */
const kPaddedOffsets = [-1, 0, 1].flatMap((i) => [-1, 0, 1].map((j) => [
  (i + 0.5) * TILE_SIZE,
  (j + 0.5) * TILE_SIZE
] as const));

function layOut(
  painted: ImageData[],
  rows: number,
  cellSize: number,
  offsets: readonly (readonly [number, number])[]
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = kAtlasCols * cellSize;
  canvas.height = rows * cellSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("blocks: unable to acquire a 2D canvas context");
  }

  for (const [index, image] of painted.entries()) {
    const x = (index % kAtlasCols) * cellSize;
    const y = Math.floor(index / kAtlasCols) * cellSize;
    for (const [dx, dy] of offsets) {
      // putImageData ignores clipping, so dirty rectangles keep copies inside the cell.
      const left = Math.max(0, -dx);
      const top = Math.max(0, -dy);
      const width = Math.min(TILE_SIZE, cellSize - dx) - left;
      const height = Math.min(TILE_SIZE, cellSize - dy) - top;
      if (width > 0 && height > 0) {
        context.putImageData(image, x + dx, y + dy, left, top, width, height);
      }
    }
  }

  return canvas;
}
