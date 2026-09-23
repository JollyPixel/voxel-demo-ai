// Import Internal Dependencies
import { B, type Block } from "../blocks/index.ts";
import type { Brush } from "../builder/Brush.ts";
import { FloatingIsland, GROUND } from "../builder/FloatingIsland.ts";
import { rising, type Direction } from "../builder/orientation.ts";
import {
  basin,
  broadleafTree,
  column,
  gateway,
  palm,
  pyramidion
} from "../builder/prefabs.ts";
import { hash } from "../utils/noise.ts";
import type { Random } from "../utils/random.ts";

// CONSTANTS
const kLawn = GROUND;
const kWallRadius = 34;
const kCardinals: readonly [dx: number, dz: number, inward: Direction][] = [
  [1, 0, "W"], [-1, 0, "E"], [0, 1, "N"], [0, -1, "S"]
];
const kDiagonals = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const kFlowers = [B.roseFlower, B.lilacFlower, B.sunFlower];

/**
 * Round walled garden after inspiration v5: paved axes and a ring path,
 * concentric flower rows between clipped hedges, trees and pools, and a
 * gazebo with a fountain on a stepped dais at the centre.
 */
export function buildPlatform(
  b: Brush,
  random: Random
): void {
  const island = new FloatingIsland({
    radius: 46,
    depth: 30,
    surface: "grass",
    flatRadius: 38,
    seed: Math.floor(random() * 2 ** 31)
  });
  island.build(b);

  const rowColours = Array.from({ length: 6 }, () => kFlowers[Math.floor(random() * kFlowers.length)]);
  b.fill([-kWallRadius - 1, kLawn, -kWallRadius - 1], [kWallRadius + 1, kLawn + 1, kWallRadius + 1], (x, y, z) => (
    y === kLawn ? groundAt(x, z) : plantingAt(x, z, rowColours)
  ));

  buildWall(b);
  buildDais(b);
  for (const [sx, sz] of kDiagonals) {
    basin(b, [sx * 19, kLawn, sz * 19], 2);
    broadleafTree(b, [sx * 10, kLawn + 1, sz * 10], 2);
    palm(b, [sx * 24, kLawn + 1, sz * 15], 7);
    palm(b, [sx * 15, kLawn + 1, sz * 24], 6);
  }
  buildOutskirts(b, island, random);
}

/**
 * The lawn course: paving on the axes and the ring path, soil under the
 * flower rows, grass elsewhere, and the wall's footing on the rim.
 */
function groundAt(
  x: number,
  z: number
): Block | undefined {
  const r = Math.hypot(x, z);
  if (r > kWallRadius + 1) {
    return undefined;
  }
  if (r >= kWallRadius - 1) {
    return B.ashlar;
  }
  if (isPaved(x, z, r)) {
    return B.flagstone;
  }

  return flowerRow(r) === undefined ? B.grass : B.soil;
}

function isPaved(
  x: number,
  z: number,
  r: number
): boolean {
  return Math.min(Math.abs(x), Math.abs(z)) <= 2 || (r >= 19 && r < 22);
}

/**
 * Index of the concentric flower row at radius `r`, if any.
 */
function flowerRow(
  r: number
): number | undefined {
  const rows = [11, 13, 15, 25, 27, 29];
  const index = rows.findIndex((start) => r >= start && r < start + 1);

  return index === -1 ? undefined : index;
}

/**
 * What grows one voxel above the lawn: hedges along the paths and around
 * each ring, and flowers on the rows, kept clear of the trees and pools.
 */
function plantingAt(
  x: number,
  z: number,
  rowColours: Block[]
): Block | undefined {
  const r = Math.hypot(x, z);
  if (r <= 9 || r >= kWallRadius - 1 || isPaved(x, z, r)) {
    return undefined;
  }
  const hedgeRing = (r >= 18 && r < 19) || (r >= 22 && r < 23) || (r >= 31 && r < 32);
  if (hedgeRing || Math.min(Math.abs(x), Math.abs(z)) === 3) {
    return B.leaves;
  }
  const row = flowerRow(r);
  const nearFeature = Math.hypot(Math.abs(x) - 10, Math.abs(z) - 10) < 3 || Math.hypot(Math.abs(x) - 19, Math.abs(z) - 19) < 5;
  if (row === undefined || nearFeature) {
    return undefined;
  }

  return rowColours[row];
}

/**
 * A crenellated limestone wall on the rim, with square piers between four
 * gateways.
 */
function buildWall(
  b: Brush
): void {
  b.fill([-kWallRadius, kLawn + 1, -kWallRadius], [kWallRadius, kLawn + 3, kWallRadius], (x, y, z) => {
    const r = Math.hypot(x, z);
    if (r < kWallRadius - 1 || r >= kWallRadius || Math.min(Math.abs(x), Math.abs(z)) <= 5) {
      return undefined;
    }
    if (y < kLawn + 3) {
      return B.limestone;
    }
    const along = Math.round(Math.atan2(z, x) * kWallRadius);

    return along % 3 === 0 ? B.limestone.slabBottom : undefined;
  });

  for (let degrees = 15; degrees < 360; degrees += 30) {
    const angle = degrees * Math.PI / 180;
    const [x, z] = [Math.round(Math.cos(angle) * (kWallRadius - 0.5)), Math.round(Math.sin(angle) * (kWallRadius - 0.5))];
    b.box([x - 1, kLawn + 1, z - 1], [x + 1, kLawn + 4, z + 1], B.limestone);
    b.box([x - 1, kLawn + 5, z - 1], [x + 1, kLawn + 5, z + 1], B.trim);
    pyramidion(b, [x, kLawn + 6, z], 1, B.sandstone);
  }
  for (const [dx, dz] of kCardinals) {
    gateway(b, [dx * kWallRadius, kLawn + 1, dz * kWallRadius], dx === 0 ? "x" : "z");
  }
}

/**
 * Two stepped discs climbed by four flights, carrying a gazebo of four
 * columns under a gold pyramidion, around a small fountain.
 */
function buildDais(
  b: Brush
): void {
  b.disc([0, kLawn, 0], 9, B.limestone);
  b.disc([0, kLawn + 1, 0], 7, B.limestone);
  b.disc([0, kLawn + 2, 0], 5, B.flagstone);
  for (const [dx, dz, inward] of kCardinals) {
    for (let across = -2; across <= 2; across++) {
      const [ax, az] = dx === 0 ? [across, 0] : [0, across];
      b.put([dx * 8 + ax, kLawn + 1, dz * 8 + az], B.limestone.stair, rising(inward));
      b.put([dx * 6 + ax, kLawn + 2, dz * 6 + az], B.limestone.stair, rising(inward));
    }
  }

  basin(b, [0, kLawn + 2, 0], 1);
  for (const [sx, sz] of kDiagonals) {
    column(b, [sx * 4, kLawn + 3, sz * 4], { height: 6 });
  }
  b.box([-5, kLawn + 9, -5], [5, kLawn + 9, 5], B.limestone);
  b.box([-5, kLawn + 10, -5], [5, kLawn + 10, 5], B.trim);
  pyramidion(b, [0, kLawn + 11, 0], 5);
}

/**
 * Trees and palms scattered on the lawn outside the wall.
 */
function buildOutskirts(
  b: Brush,
  island: FloatingIsland,
  random: Random
): void {
  for (let i = 0; i < 16; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 38 + random() * 5;
    const [x, z] = [Math.round(Math.cos(angle) * distance), Math.round(Math.sin(angle) * distance)];
    const surface = island.surfaceAt(x, z);
    // Keep the causeway to the pyramid clear.
    if (surface === undefined || (x > 0 && Math.abs(z) < 8)) {
      continue;
    }
    if (hash(x, 0, z, 3) > 0.5) {
      palm(b, [x, surface, z], 6 + Math.floor(random() * 3));
    }
    else {
      broadleafTree(b, [x, surface, z], 2);
    }
  }
}
