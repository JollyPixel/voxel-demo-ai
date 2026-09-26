// Import Third-party Dependencies
import type { VoxelTransformOptions } from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import type { Block } from "../../../core/blocks/registry.ts";
import type { Brush, Vec3 } from "../../../core/builder/Brush.ts";
import { outerCorner, rising } from "../../../core/builder/orientation.ts";
import { B } from "../blocks.ts";

export type Axis = "x" | "z";

// CONSTANTS
const kDiagonals = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

/**
 * Turns a horizontal pole, which spans z unturned, to lie along `axis`.
 */
export function lying(
  axis: Axis
): VoxelTransformOptions {
  return axis === "z" ? {} : { rotation: 1 };
}

/**
 * The cell `offset` voxels from `[x, y + dy, z]` along `axis`, and `across`
 * voxels along the other horizontal axis.
 */
function along(
  [x, y, z]: Vec3,
  axis: Axis,
  offset: number,
  dy = 0,
  across = 0
): Vec3 {
  return axis === "x" ? [x + offset, y + dy, z + across] : [x + across, y + dy, z + offset];
}

export interface ToriiOptions {
  /**
   * Distance from the centre to each pillar.
   */
  half: number;
  /**
   * Pillar height, up to the tie under the top lintel.
   */
  height: number;
  /**
   * Axis the lintels span; the path runs through along the other one.
   */
  axis: Axis;
  /**
   * Thick pillars and deep lintels, for the great gate of the valley.
   * @default false
   */
  grand?: boolean;
}

/**
 * Myōjin torii: vermilion pillars on black footings, a tie beam through
 * them, and a black top lintel whose ends sweep up, with a plaque between.
 */
export function torii(
  b: Brush,
  origin: Vec3,
  { half, height, axis, grand = false }: ToriiOptions
): void {
  const girth = grand ? 1 : 0;
  const reach = half + girth + 2;

  for (const side of [-1, 1]) {
    for (let a = -girth; a <= girth; a++) {
      for (let c = -girth; c <= girth; c++) {
        if (Math.abs(a) + Math.abs(c) > girth) {
          continue;
        }
        const foot = grand ? 1 : 0;
        for (let dy = 0; dy < height; dy++) {
          b.put(along(origin, axis, side * half + a, dy, c), dy <= foot ? B.darkWood : B.vermilion);
        }
      }
    }
  }

  const tie = height - (grand ? 6 : 3);
  for (let offset = -reach; offset <= reach; offset++) {
    b.put(along(origin, axis, offset, tie), B.vermilion);
    for (let c = -girth; c <= girth; c++) {
      b.put(along(origin, axis, offset, height, c), B.vermilion);
      b.put(along(origin, axis, offset, height + 1, c), B.darkWood);
      if (grand) {
        b.put(along(origin, axis, offset, height + 2, c), B.darkWood);
      }
    }
  }
  const top = height + (grand ? 3 : 2);
  for (const side of [-1, 1]) {
    for (let c = -girth; c <= girth; c++) {
      b.put(along(origin, axis, side * (reach + 1), top - 1, c), B.darkWood);
      b.put(along(origin, axis, side * (reach + 1), top, c), B.darkWood.slabBottom);
    }
  }
  for (let dy = tie + 1; dy < height; dy++) {
    b.put(along(origin, axis, 0, dy), grand && dy === tie + 2 ? B.gold : B.darkWood);
  }
}

/**
 * Tōrō: a stone lantern on a post, its firebox a paper light between four
 * corner posts, under a little pyramid roof. The paper glows through its
 * emissive finish rather than a point light, which every pixel of the frame
 * would pay for (see FEEDBACK F-4).
 */
export function stoneLantern(
  b: Brush,
  [x, y, z]: Vec3
): void {
  b.box([x - 1, y, z - 1], [x + 1, y, z + 1], B.lanternStone.slabBottom);
  b.box([x, y + 1, z], [x, y + 2, z], B.lanternStone.poleY);
  b.box([x - 1, y + 3, z - 1], [x + 1, y + 3, z + 1], B.lanternStone.slabTop);
  b.put([x, y + 4, z], B.lantern);
  for (const [sx, sz] of kDiagonals) {
    b.put([x + sx, y + 4, z + sz], B.lanternStone.poleY);
  }
  b.put([x, y + 5, z], B.lanternStone);
  b.put([x + 1, y + 5, z], B.lanternStone.ramp, rising("W"));
  b.put([x - 1, y + 5, z], B.lanternStone.ramp, rising("E"));
  b.put([x, y + 5, z + 1], B.lanternStone.ramp, rising("N"));
  b.put([x, y + 5, z - 1], B.lanternStone.ramp, rising("S"));
  for (const [sx, sz] of kDiagonals) {
    b.put([x + sx, y + 5, z + sz], B.lanternStone.rampCornerOuter, outerCorner("ramp", -sx, -sz));
  }
  b.put([x, y + 6, z], B.lanternStone.poleY);
}

/**
 * A small post lantern for paths: a stone foot, a post, the light and a cap.
 */
export function postLantern(
  b: Brush,
  [x, y, z]: Vec3
): void {
  b.put([x, y, z], B.lanternStone.slabBottom);
  b.put([x, y + 1, z], B.lanternStone.poleY);
  b.put([x, y + 2, z], B.lantern);
  b.put([x, y + 3, z], B.lanternStone.slabBottom);
}

/**
 * A paper lantern hanging from the cell `[x, y, z]` under a beam.
 */
export function hangingLantern(
  b: Brush,
  [x, y, z]: Vec3
): void {
  b.put([x, y, z], B.darkWood.poleY);
  b.put([x, y - 1, z], B.lantern);
}

/**
 * A low fence from `from` to `to` along one axis: posts every `every`
 * voxels with rails between, and an optional cap on each post.
 */
export function railing(
  b: Brush,
  from: Vec3,
  to: Vec3,
  material: typeof B.vermilion | typeof B.cedar | typeof B.darkWood = B.vermilion,
  options: { every?: number; cap?: Block; } = {}
): void {
  const { every = 3, cap } = options;
  const axis: Axis = from[0] === to[0] ? "z" : "x";
  const index = axis === "x" ? 0 : 2;
  const [start, end] = [Math.min(from[index], to[index]), Math.max(from[index], to[index])];

  for (let value = start; value <= end; value++) {
    const cell: Vec3 = axis === "x" ? [value, from[1], from[2]] : [from[0], from[1], value];
    const post = (value - start) % every === 0 || value === end;
    b.put(cell, post ? material.poleY : material.pole, post ? {} : lying(axis));
    if (post && cap) {
      b.put([cell[0], cell[1] + 1, cell[2]], cap);
    }
  }
}

export interface WallOptions {
  /**
   * @default B.vermilion
   */
  post?: Block;
  /**
   * Distance between posts along each wall.
   * @default 4
   */
  every?: number;
  /**
   * Infill between the posts by course, from 0 at the sill to `height - 1`
   * under the beam; undefined leaves the course open.
   */
  panel?: (course: number, height: number) => Block | undefined;
  /**
   * Cells left open, e.g. a doorway, by offset from the centre.
   */
  open?: (dx: number, dz: number, course: number) => boolean;
}

/**
 * Timber-framed walls on the outline of a rectangle: posts at the corners
 * and every `every` voxels, a dark sill, the infill, and a vermilion beam as
 * the top course.
 */
export function walls(
  b: Brush,
  [x, y, z]: Vec3,
  [hx, hz]: readonly [halfX: number, halfZ: number],
  height: number,
  options: WallOptions = {}
): void {
  const { post = B.vermilion, every = 4, panel = defaultPanel, open } = options;

  b.fill([x - hx, y, z - hz], [x + hx, y + height - 1, z + hz], (cx, cy, cz) => {
    const dx = cx - x;
    const dz = cz - z;
    if (Math.abs(dx) !== hx && Math.abs(dz) !== hz) {
      return undefined;
    }
    const course = cy - y;
    if (open?.(dx, dz, course)) {
      return undefined;
    }
    const alongWall = Math.abs(dx) === hx ? dz : dx;
    const corner = Math.abs(dx) === hx && Math.abs(dz) === hz;
    if (corner || alongWall % every === 0) {
      return post;
    }
    if (course === height - 1) {
      return B.vermilion;
    }

    return course === 0 ? B.darkWood : panel(course, height);
  });
}

function defaultPanel(
  course: number,
  height: number
): Block {
  return course >= height - 3 ? B.plaster : B.shoji;
}

/**
 * Vermilion columns, one per position, `height` tall from `y`.
 */
export function columns(
  b: Brush,
  positions: readonly (readonly [x: number, z: number])[],
  y: number,
  height: number,
  block: Block = B.vermilion
): void {
  for (const [x, z] of positions) {
    b.box([x, y, z], [x, y + height - 1, z], block);
  }
}

/**
 * Taiko-bashi: a vermilion drum bridge along z from `z0` to `z1`, its plank
 * deck arching `rise` voxels in half-voxel steps over `[x, y]`, the first
 * air cell above the banks, with fascia beams and capped rails.
 */
export function drumBridge(
  b: Brush,
  [x, y, z0]: Vec3,
  z1: number,
  halfWidth: number,
  rise: number
): void {
  const length = z1 - z0;

  for (let z = z0; z <= z1; z++) {
    /*
     * Height of the deck's top above `y`, in half voxels: odd counts end on
     * a slab, even ones on a full block.
     */
    const halves = 1 + Math.round(2 * rise * Math.sin(Math.PI * (z - z0) / length));
    const slab = halves % 2 === 1;
    const cy = y + Math.ceil(halves / 2) - 1;
    b.box([x - halfWidth, cy, z], [x + halfWidth, cy, z], slab ? B.cedar.slabBottom : B.cedar);
    for (const sx of [-1, 1]) {
      const fx = x + sx * (halfWidth + 1);
      b.put([fx, cy, z], slab ? B.vermilion.slabBottom : B.vermilion);
      if (cy > y) {
        b.put([fx, cy - 1, z], B.vermilion.slabTop);
      }
      const post = (z - z0) % 3 === 0 || z === z1;
      b.put([fx, cy + 1, z], post ? B.vermilion.poleY : B.vermilion.pole);
      if (post && (z === z0 || z === z1 || (z - z0) % 6 === 0)) {
        b.put([fx, cy + 2, z], B.gold.slabBottom);
      }
    }
  }
}
