// Import Internal Dependencies
import { B, type Block } from "../blocks/index.ts";
import type { Brush } from "../builder/Brush.ts";
import { FloatingIsland, GROUND } from "../builder/FloatingIsland.ts";
import { rising, type Direction } from "../builder/orientation.ts";
import {
  acacia,
  basin,
  broadleafTree,
  column,
  gateway,
  giantTree,
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
/**
 * The giant tree stands in the north-west quadrant, between the ring path
 * and the wall; hedges keep clear of its trunk.
 */
const kGiantTree = { x: -21, z: -21, clearance: 7 };
const kDaisRadius = 13;

/**
 * Round walled garden after inspiration v5: paved axes and a ring path,
 * lawns between rings of clipped hedges and pools, a giant tree rooted in
 * one quadrant, and a temple with a fountain on a stepped dais at the
 * centre.
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

  b.fill([-kWallRadius - 1, kLawn, -kWallRadius - 1], [kWallRadius + 1, kLawn + 1, kWallRadius + 1], (x, y, z) => (
    y === kLawn ? groundAt(x, z) : plantingAt(x, z)
  ));

  buildWall(b);
  buildDais(b);
  for (const [sx, sz] of kDiagonals) {
    if (Math.sign(kGiantTree.x) !== sx || Math.sign(kGiantTree.z) !== sz) {
      basin(b, [sx * 19, kLawn, sz * 19], 2);
    }
  }
  buildOutskirts(b, island, random);
  // Last, so its roots break through the lawn, the hedges and the wall.
  giantTree(b, [kGiantTree.x, kLawn + 1, kGiantTree.z]);
}

/**
 * The lawn course: paving on the axes and the ring path, grass elsewhere,
 * and the wall's footing on the rim.
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

  return B.grass;
}

function isPaved(
  x: number,
  z: number,
  r: number
): boolean {
  return Math.min(Math.abs(x), Math.abs(z)) <= 2 || (r >= 19 && r < 22);
}

/**
 * What grows one voxel above the lawn: hedges along the paths and around
 * each ring.
 */
function plantingAt(
  x: number,
  z: number
): Block | undefined {
  const r = Math.hypot(x, z);
  const nearTree = Math.hypot(x - kGiantTree.x, z - kGiantTree.z) < kGiantTree.clearance;
  if (r <= kDaisRadius || r >= kWallRadius - 1 || nearTree || isPaved(x, z, r)) {
    return undefined;
  }
  const hedgeRing = (r >= 18 && r < 19) || (r >= 22 && r < 23) || (r >= 31 && r < 32);

  return hedgeRing || Math.min(Math.abs(x), Math.abs(z)) === 3 ? B.leaves : undefined;
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
 * Two stepped discs climbed by four flights, carrying a temple of twelve
 * columns under a gold pyramidion, around a fountain.
 */
function buildDais(
  b: Brush
): void {
  const inner = kDaisRadius - 4;

  b.disc([0, kLawn, 0], kDaisRadius, B.limestone);
  b.disc([0, kLawn + 1, 0], kDaisRadius - 2, B.limestone);
  b.disc([0, kLawn + 2, 0], inner, B.flagstone);
  for (const [dx, dz, inward] of kCardinals) {
    for (let across = -3; across <= 3; across++) {
      const [ax, az] = dx === 0 ? [across, 0] : [0, across];
      b.put([dx * (kDaisRadius - 1) + ax, kLawn + 1, dz * (kDaisRadius - 1) + az], B.limestone.stair, rising(inward));
      b.put([dx * (kDaisRadius - 3) + ax, kLawn + 2, dz * (kDaisRadius - 3) + az], B.limestone.stair, rising(inward));
    }
  }

  basin(b, [0, kLawn + 2, 0], 2);
  // Corner columns, and a pair on each side framing the entrance.
  const columns = [...kDiagonals.map(([sx, sz]) => [sx * 6, sz * 6]), [6, 3], [6, -3], [-6, 3], [-6, -3], [3, 6], [-3, 6], [3, -6], [-3, -6]];
  for (const [x, z] of columns) {
    column(b, [x, kLawn + 3, z], { height: 9 });
  }
  b.box([-7, kLawn + 12, -7], [7, kLawn + 12, 7], B.limestone);
  b.box([-7, kLawn + 13, -7], [7, kLawn + 13, 7], B.trim);
  b.box([-6, kLawn + 14, -6], [6, kLawn + 14, 6], B.limestone.slabBottom);
  pyramidion(b, [0, kLawn + 15, 0], 6);
}

/**
 * Trees scattered on the lawn outside the wall.
 */
function buildOutskirts(
  b: Brush,
  island: FloatingIsland,
  random: Random
): void {
  for (let i = 0; i < 6; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 38 + random() * 5;
    const [x, z] = [Math.round(Math.cos(angle) * distance), Math.round(Math.sin(angle) * distance)];
    const surface = island.surfaceAt(x, z);
    // Keep the causeway to the pyramid and the giant tree's canopy clear.
    const underCanopy = Math.hypot(x - kGiantTree.x, z - kGiantTree.z) < 24;
    if (surface === undefined || (x > 0 && Math.abs(z) < 8) || underCanopy) {
      continue;
    }
    if (hash(x, 0, z, 3) > 0.5) {
      acacia(b, [x, surface, z], 5 + Math.floor(random() * 3));
    }
    else {
      broadleafTree(b, [x, surface, z], 2);
    }
  }
}
