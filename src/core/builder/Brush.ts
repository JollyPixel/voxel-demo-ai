// Import Third-party Dependencies
import {
  VoxelTransform,
  type VoxelPatchCells,
  type VoxelTransformOptions,
  type VoxelWorld
} from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import type { Block } from "../blocks/registry.ts";
import { hash } from "../utils/noise.ts";
import type { Fixtures, PointLightFixture } from "./fixtures.ts";

export type Vec3 = readonly [x: number, y: number, z: number];

/**
 * Chooses the block for one cell, or leaves it untouched with `undefined`.
 */
export type CellPicker = (x: number, y: number, z: number) => Block | undefined;

// CONSTANTS
const kAlternateSeed = 97;
const kAir = 0;

/**
 * The one layer every world is built in. Later writes replace earlier ones,
 * so a world is built from the ground up: terrain, then structures, then
 * plants.
 */
export const WORLD_LAYER = "World";

/**
 * The world calls a brush writes through.
 */
export type BrushWorld = Pick<VoxelWorld, "getLayer" | "patchVoxels">;

interface BrushTarget {
  world: BrushWorld;
  /**
   * Cells written since the last `flush()`, in write order.
   */
  cells: VoxelPatchCells;
  fixtures: Fixtures;
}

/**
 * Writes blocks into the world's layer in local coordinates. Writes are
 * queued as a voxel patch and reach the world on `flush()`, the engine's
 * fastest bulk write. Every scene element that is not a voxel (water,
 * lights) is collected as a fixture at its world position.
 */
export class Brush {
  static forWorld(
    world: BrushWorld
  ): Brush {
    if (!world.getLayer(WORLD_LAYER)) {
      throw new Error(`Brush: missing world layer "${WORLD_LAYER}"`);
    }

    return new Brush({ world, cells: [], fixtures: { pools: [], waterfalls: [], lights: [] } }, [0, 0, 0]);
  }

  readonly #target: BrushTarget;
  readonly #offset: Vec3;

  private constructor(
    target: BrushTarget,
    offset: Vec3
  ) {
    this.#target = target;
    this.#offset = offset;
  }

  get fixtures(): Readonly<Fixtures> {
    return this.#target.fixtures;
  }

  /**
   * Writes the cells queued by this brush and every brush translated from
   * it into the world, as one patch. Later cells replace earlier ones.
   */
  flush(): void {
    const target = this.#target;
    if (target.cells.length > 0) {
      target.world.patchVoxels(WORLD_LAYER, target.cells);
      target.cells = [];
    }
  }

  /**
   * A brush drawing into the same world, with its origin moved by `offset`.
   */
  translated(
    offset: Vec3
  ): Brush {
    return new Brush(this.#target, this.#world(offset));
  }

  /**
   * Writes `block`, replacing whatever the cell held. Blocks with alternate
   * tiles get the one hashed from the world position, so copies and rebuilds
   * agree.
   */
  put(
    position: Vec3,
    block: Block,
    transform: VoxelTransformOptions = {}
  ): void {
    const [x, y, z] = this.#cell(position);
    const { ids } = block;
    const id = ids.length === 1 ? ids[0] : ids[Math.floor(hash(x, y, z, kAlternateSeed) * ids.length)];

    this.#target.cells.push(x, y, z, id, VoxelTransform.pack(transform));
  }

  box(
    from: Vec3,
    to: Vec3,
    block: Block
  ): void {
    this.fill(from, to, () => block);
  }

  /**
   * Visits every cell of an inclusive box, in local coordinates, and writes
   * whatever `pick` returns for it.
   */
  fill(
    [x0, y0, z0]: Vec3,
    [x1, y1, z1]: Vec3,
    pick: CellPicker
  ): void {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const block = pick(x, y, z);
          if (block) {
            this.put([x, y, z], block);
          }
        }
      }
    }
  }

  /**
   * Empties an inclusive box, e.g. to carve a doorway.
   */
  clear(
    from: Vec3,
    to: Vec3
  ): void {
    const [x0, y0, z0] = this.#cell(from);
    const [x1, y1, z1] = this.#cell(to);
    const { cells } = this.#target;

    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          cells.push(x, y, z, kAir, 0);
        }
      }
    }
  }

  /**
   * Horizontal disc of lattice points within `radius` of `center`.
   */
  disc(
    center: Vec3,
    radius: number,
    block: Block
  ): void {
    this.ring(center, radius, radius + 1, block);
  }

  /**
   * Horizontal annulus: cells between `radius - thickness` and `radius`.
   */
  ring(
    [cx, y, cz]: Vec3,
    radius: number,
    thickness: number,
    block: Block
  ): void {
    const inner = Math.max(0, radius - thickness);

    for (let z = -radius; z <= radius; z++) {
      for (let x = -radius; x <= radius; x++) {
        const distance = x * x + z * z;
        if (distance <= radius * radius && distance >= inner * inner) {
          this.put([cx + x, y, cz + z], block);
        }
      }
    }
  }

  /**
   * Horizontal water surface of `width` (x) by `depth` (z).
   */
  pool(
    center: Vec3,
    width: number,
    depth: number
  ): void {
    this.#target.fixtures.pools.push({ center: this.#world(center), width, depth });
  }

  /**
   * Vertical water sheet falling past `center`, spanning `width` along
   * `axis`: in the z/y plane by default, or in the x/y plane.
   */
  waterfall(
    center: Vec3,
    width: number,
    height: number,
    axis: "x" | "z" = "z"
  ): void {
    this.#target.fixtures.waterfalls.push({ center: this.#world(center), width, height, axis });
  }

  light(
    position: Vec3,
    light: Omit<PointLightFixture, "position">
  ): void {
    this.#target.fixtures.lights.push({ ...light, position: this.#world(position) });
  }

  #world(
    [x, y, z]: Vec3
  ): Vec3 {
    const [ox, oy, oz] = this.#offset;

    return [x + ox, y + oy, z + oz];
  }

  #cell(
    position: Vec3
  ): Vec3 {
    const [x, y, z] = this.#world(position);

    return [Math.round(x), Math.round(y), Math.round(z)];
  }
}
