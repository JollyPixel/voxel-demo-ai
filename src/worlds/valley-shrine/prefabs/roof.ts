// Import Third-party Dependencies
import type { VoxelTransformOptions } from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import type { Block } from "../../../core/blocks/registry.ts";
import type { Brush, Vec3 } from "../../../core/builder/Brush.ts";
import {
  outerCorner,
  rising,
  type Direction
} from "../../../core/builder/orientation.ts";
import { B } from "../blocks.ts";

export type RoofTile = typeof B.roofTile | typeof B.copperRoof;

export interface RoofOptions {
  /**
   * @default B.roofTile
   */
  tile?: RoofTile;
  /**
   * Layers at the eave that climb one voxel every two, before the slope
   * steepens to one in one: the roof's concave sweep.
   * @default 2
   */
  eave?: number;
  /**
   * Hip layers before the long axis stops stepping in and its ends rise as
   * gables (irimoya). `null` keeps a hip roof to the top.
   * @default null
   */
  gable?: number | null;
  /**
   * Fills the triangular gable ends.
   * @default B.darkWood
   */
  pediment?: Block;
  /**
   * Half extents of the walls under the roof: the eaves overhanging them get
   * a dark soffit and a row of brackets.
   */
  wall?: readonly [halfX: number, halfZ: number];
  /**
   * Lift the four eave corners.
   * @default true
   */
  upturn?: boolean;
  /**
   * Stop once the roof has stepped in to these half extents, leaving a flat
   * top for whatever stands on it (a pagoda's next storey).
   */
  until?: readonly [halfX: number, halfZ: number];
  /**
   * Gold horns on the ridge ends, or a finial on a pyramidal roof.
   * @default true
   */
  ornaments?: boolean;
}

// CONSTANTS
const kInward: Record<string, Direction> = { "1,0": "W", "-1,0": "E", "0,1": "N", "0,-1": "S" };

/**
 * A Japanese roof over the rectangle of half extents `halfX` by `halfZ`
 * centred on `[x, z]`, its eave course at `y`. Slopes are ramps, the eave
 * sweep slabs and stairs; a hip roof closes on a ridge (or a point), an
 * irimoya one on a ridge between two gables. Returns the y of the top
 * course.
 */
export function roof(
  b: Brush,
  [x, y, z]: Vec3,
  halfX: number,
  halfZ: number,
  options: RoofOptions = {}
): number {
  const {
    tile = B.roofTile,
    eave = 2,
    gable = null,
    pediment = B.darkWood,
    wall,
    upturn = true,
    until,
    ornaments = true
  } = options;
  const longAxis = halfX >= halfZ ? "x" : "z";

  if (wall) {
    underside(b, [x, y, z], halfX, halfZ, wall);
  }

  let hx = halfX;
  let hz = halfZ;
  for (let layer = 0; ; layer++) {
    const cy = y + layer;
    if (until && hx <= until[0] && hz <= until[1]) {
      return cy - 1;
    }
    if (Math.min(hx, hz) === 0) {
      cap(b, [x, cy, z], [hx, hz], { tile, ornaments });

      return cy;
    }

    const step = layer < eave ? Math.min(2, hx, hz) : 1;
    const gabled = gable !== null && layer >= gable && halfX !== halfZ;
    const course: Course = {
      hx,
      hz,
      step,
      stepX: gabled && longAxis === "x" ? 0 : step,
      stepZ: gabled && longAxis === "z" ? 0 : step,
      gableAxis: gabled ? longAxis : null
    };
    for (let dz = -hz; dz <= hz; dz++) {
      for (let dx = -hx; dx <= hx; dx++) {
        const [block, transform] = piece(course, dx, dz, tile, pediment);
        b.put([x + dx, cy, z + dz], block, transform);
      }
    }

    if (layer === 0 && upturn && step === 2) {
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const [cx, cz] = [x + sx * hx, z + sz * hz];
        b.put([cx, cy, cz], tile);
        b.put([cx - sx, cy, cz], tile);
        b.put([cx, cy, cz - sz], tile);
        b.put([cx, cy + 1, cz], tile.slabBottom);
      }
    }

    hx -= course.stepX;
    hz -= course.stepZ;
  }
}

/**
 * One course of a roof: its half extents, how far each axis steps in over
 * it, and the axis whose ends are gables, if any.
 */
interface Course {
  hx: number;
  hz: number;
  step: number;
  stepX: number;
  stepZ: number;
  gableAxis: "x" | "z" | null;
}

/**
 * The block of a course at offset (dx, dz) from its centre: slabs and
 * stairs on a shallow eave course, ramps on a steep one, corner pieces
 * where two slopes meet, and solid tile (or the pediment on a gable end)
 * inside.
 */
function piece(
  { hx, hz, step, stepX, stepZ, gableAxis }: Course,
  dx: number,
  dz: number,
  tile: RoofTile,
  pediment: Block
): [Block, VoxelTransformOptions] {
  const ex = hx - Math.abs(dx);
  const ez = hz - Math.abs(dz);
  const onX = ex < stepX;
  const onZ = ez < stepZ;
  const [sx, sz] = [Math.sign(dx), Math.sign(dz)];

  if (!onX && !onZ) {
    const gableEnd = gableAxis === "x" ? ex === 0 : gableAxis === "z" && ez === 0;

    return [gableEnd ? pediment : tile, {}];
  }
  if (onX && onZ) {
    if (step === 1) {
      return [tile.rampCornerOuter, outerCorner("ramp", -sx, -sz)];
    }

    return ex === 1 && ez === 1 ? [tile.stairCornerOuter, outerCorner("stair", -sx, -sz)] : [tile.slabBottom, {}];
  }
  const [edge, inward] = onX ? [ex, kInward[`${sx},0`]] : [ez, kInward[`0,${sz}`]];
  if (step === 1) {
    return [tile.ramp, rising(inward)];
  }

  return edge === 0 ? [tile.slabBottom, {}] : [tile.stair, rising(inward)];
}

/**
 * The ridge (or the apex of a pyramidal roof) on the top course.
 */
function cap(
  b: Brush,
  [x, y, z]: Vec3,
  [hx, hz]: readonly [number, number],
  { tile, ornaments }: { tile: RoofTile; ornaments: boolean; }
): void {
  b.box([x - hx, y, z - hz], [x + hx, y, z + hz], tile);
  if (hx === 0 && hz === 0) {
    b.put([x, y + 1, z], tile.slabBottom);
    if (ornaments) {
      b.box([x, y + 1, z], [x, y + 2, z], B.gold.poleY);
      b.put([x, y + 3, z], B.gold.slabBottom);
    }

    return;
  }

  b.box([x - hx, y + 1, z - hz], [x + hx, y + 1, z + hz], tile.slabBottom);
  const ends: [Vec3, Direction][] = hx > 0 ?
    [[[x - hx, y + 1, z], "W"], [[x + hx, y + 1, z], "E"]] :
    [[[x, y + 1, z - hz], "N"], [[x, y + 1, z + hz], "S"]];
  for (const [[ex, ey, ez], outward] of ends) {
    b.put([ex, ey, ez], tile);
    if (ornaments) {
      b.put([ex, ey + 1, ez], B.gold.stair, rising(outward));
    }
  }
}

/**
 * Dark soffit under the eaves over a top plate on the walls, and a course of
 * brackets stepping out from the top of the walls.
 */
function underside(
  b: Brush,
  [x, y, z]: Vec3,
  halfX: number,
  halfZ: number,
  [wx, wz]: readonly [number, number]
): void {
  b.fill([x - halfX, y - 1, z - halfZ], [x + halfX, y - 1, z + halfZ], (cx, _cy, cz) => {
    const ox = Math.abs(cx - x) - wx;
    const oz = Math.abs(cz - z) - wz;
    if (ox > 0 || oz > 0) {
      return B.darkWood.slabTop;
    }

    return ox === 0 || oz === 0 ? B.darkWood : undefined;
  });
  const bx = wx + 1;
  const bz = wz + 1;
  for (let dx = -bx; dx <= bx; dx++) {
    for (const sz of [-1, 1]) {
      const edge = Math.abs(dx) === bx;
      b.put([x + dx, y - 2, z + sz * bz], edge ? B.darkWood.stairCornerOuter : B.darkWood.stair, edge ?
        { ...outerCorner("stair", -Math.sign(dx), -sz), flipY: true } :
        { ...rising(sz > 0 ? "N" : "S"), flipY: true });
    }
  }
  for (let dz = -wz; dz <= wz; dz++) {
    for (const sx of [-1, 1]) {
      b.put([x + sx * bx, y - 2, z + dz], B.darkWood.stair, { ...rising(sx > 0 ? "W" : "E"), flipY: true });
    }
  }
}
