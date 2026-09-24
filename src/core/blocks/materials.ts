// Import Third-party Dependencies
import type { BlockShapeID, FaceSlotName } from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import type { TilePainter } from "./painters/tile.ts";

/**
 * Texture slots of the engine's built-in shapes, plus `sides` for the four
 * vertical faces at once.
 */
export type FaceSlot = FaceSlotName | "sides";

export interface MaterialSpec<Layer extends string = string> {
  name: string;
  layer: Layer;
  tile: TilePainter;
  /**
   * Tiles painted from the same painter with different seeds. The brush picks
   * one per voxel from its position, which breaks up visible repetition.
   * @default 1
   */
  alternates?: number;
  /**
   * Tiles for particular faces, e.g. the soil sides of a grass block.
   */
  faces?: Partial<Record<FaceSlot, TilePainter>>;
  /**
   * Extra shaped blocks sharing this material's first tile, reachable as
   * `B.<material>.<shape>`.
   */
  variants?: readonly BlockShapeID[];
  /**
   * Alpha-masked foliage: rendered double-sided, never collidable.
   */
  cutout?: boolean;
  /**
   * Material group whose finish, from the block set's `finishes`, these
   * blocks render with. The finish is saved in the world document.
   */
  group?: string;
}

export interface SurfaceFinish {
  roughness: number;
  metalness: number;
}

/**
 * Finish of blocks outside any material group: matte stone.
 */
export const DEFAULT_FINISH: SurfaceFinish = { roughness: 0.89, metalness: 0 };
