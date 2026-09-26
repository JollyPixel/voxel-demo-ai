// Import Internal Dependencies
import type { Block } from "../blocks/registry.ts";
import type { Brush } from "./Brush.ts";

// CONSTANTS
const kNoGround = -0x8000;

/**
 * One voxel of a terrain column, handed to the material picker.
 */
export interface TerrainCell {
  x: number;
  y: number;
  z: number;
  /**
   * Voxels between this one and the surface; 0 is the top voxel.
   */
  depth: number;
  /**
   * Largest height difference to the four neighbouring columns.
   */
  slope: number;
}

export interface HeightfieldOptions {
  /**
   * Inclusive local bounds of the columns, as (x, z).
   */
  min: readonly [x: number, z: number];
  max: readonly [x: number, z: number];
  /**
   * First air cell above the ground at (x, z), or undefined where there is
   * no ground at all.
   */
  height: (x: number, z: number) => number | undefined;
  material: (cell: TerrainCell) => Block;
  /**
   * How far down a column on the rim reaches, where its side shows.
   */
  rimBottom: (x: number, z: number) => number;
  /**
   * Voxels kept under the lowest neighbouring surface.
   * @default 1
   */
  shell?: number;
}

/**
 * Terrain from a height function. Only the skin is written: each column
 * goes down just far enough to cover the side faces its lower neighbours
 * expose, since nothing ever looks inside the ground. Columns on the rim
 * reach down to `rimBottom`.
 */
export class Heightfield {
  readonly #options: HeightfieldOptions;
  readonly #width: number;
  readonly #heights: Int16Array;

  constructor(
    options: HeightfieldOptions
  ) {
    this.#options = options;
    const [x0, z0] = options.min;
    const [x1, z1] = options.max;
    this.#width = x1 - x0 + 1;
    this.#heights = new Int16Array(this.#width * (z1 - z0 + 1)).fill(kNoGround);

    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const height = options.height(x, z);
        if (height !== undefined) {
          this.#heights[this.#index(x, z)] = height;
        }
      }
    }
  }

  /**
   * First air cell above the ground at (x, z), if there is ground.
   */
  surfaceAt(
    x: number,
    z: number
  ): number | undefined {
    const [x0, z0] = this.#options.min;
    const [x1, z1] = this.#options.max;
    if (x < x0 || x > x1 || z < z0 || z > z1) {
      return undefined;
    }
    const height = this.#heights[this.#index(x, z)];

    return height === kNoGround ? undefined : height;
  }

  build(
    b: Brush
  ): void {
    const { min: [x0, z0], max: [x1, z1], material, rimBottom, shell = 1 } = this.#options;
    const cell: TerrainCell = { x: 0, y: 0, z: 0, depth: 0, slope: 0 };

    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const surface = this.surfaceAt(x, z);
        if (surface === undefined) {
          continue;
        }
        const top = surface - 1;
        let lowest = top;
        let slope = 0;
        let rim = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const neighbour = this.surfaceAt(x + dx, z + dz);
          if (neighbour === undefined) {
            rim = true;
            continue;
          }
          lowest = Math.min(lowest, neighbour - 1);
          slope = Math.max(slope, Math.abs(neighbour - surface));
        }
        const bottom = rim ? Math.min(top - shell, rimBottom(x, z)) : lowest - shell;

        cell.x = x;
        cell.z = z;
        cell.slope = slope;
        for (let y = top; y >= bottom; y--) {
          cell.y = y;
          cell.depth = top - y;
          b.put([x, y, z], material(cell));
        }
      }
    }
  }

  #index(
    x: number,
    z: number
  ): number {
    const [x0, z0] = this.#options.min;

    return (z - z0) * this.#width + (x - x0);
  }
}
