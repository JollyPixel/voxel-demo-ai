// Import Internal Dependencies
import { B, ISLAND_BLOCKS } from "../blocks.ts";
import type { Brush } from "../../../core/builder/Brush.ts";
import { FloatingIsland, GROUND } from "../../../core/builder/FloatingIsland.ts";
import { outerCorner, rising } from "../../../core/builder/orientation.ts";
import {
  acacia,
  basin,
  brazier,
  broadleafTree,
  column,
  hedge,
  obelisk,
  pyramidion,
  sarcophagus
} from "../prefabs.ts";
import type { Random } from "../../../core/utils/random.ts";

interface Tier {
  half: number;
  bottom: number;
  top: number;
}

// CONSTANTS
const kFloor = GROUND + 1;
const kWall = 3;
/**
 * Seven tiers stepping in by five voxels: a tall base course, then five
 * voxels each.
 */
const kTiers: readonly Tier[] = Array.from({ length: 7 }, (_, index) => {
  return {
    half: 48 - index * 5,
    bottom: index === 0 ? GROUND + 2 : GROUND + 4 + index * 5,
    top: GROUND + 8 + index * 5
  };
});
const kPlinthHalf = kTiers[0].half + 4;
const kSummit = kTiers[kTiers.length - 1];
/**
 * The twin west flights climb one voxel per voxel, y = x + kFlightOffset,
 * and land on the summit's west edge.
 */
const kFlightOffset = kSummit.top + kSummit.half + 1;
const kFlightLanes = [[7, 12], [-12, -7]] as const;

/**
 * Stepped tomb centred on its origin, after inspiration v3: banded tiers with
 * cornices and terrace gardens, twin stair flights on the west face, a door
 * into a stepped atrium lit through an oculus, a summit shrine, and an oasis
 * spilling off the east rim.
 */
export function buildPyramid(
  b: Brush,
  random: Random
): void {
  const island = new FloatingIsland({
    radius: 80,
    depth: 48,
    surface: "sand",
    flatRadius: 72,
    seed: Math.floor(random() * 2 ** 31),
    blocks: ISLAND_BLOCKS
  });
  island.build(b);

  buildPlinth(b);
  for (const [index, tier] of kTiers.entries()) {
    buildTier(b, tier, index === kTiers.length - 1);
  }
  for (const [index, tier] of kTiers.entries()) {
    buildCornice(b, tier);
    if (index > 0) {
      buildTerrace(b, kTiers[index - 1], tier, index % 2 === 1);
    }
  }
  buildFlights(b);
  buildDoorway(b);
  buildInterior(b, random);
  buildShrine(b);
  buildOasis(b, island, random);
}

/**
 * Distance to the centre in the square metric the tiers are built in.
 */
function ring(
  x: number,
  z: number
): number {
  return Math.max(Math.abs(x), Math.abs(z));
}

/**
 * Height of the first air cell above the stepped mass at a given ring.
 */
function surfaceAt(
  r: number
): number {
  const tier = kTiers.findLast(({ half }) => half >= r);
  if (tier) {
    return tier.top + 1;
  }

  return r <= kPlinthHalf ? kFloor + 1 : GROUND;
}

function buildPlinth(
  b: Brush
): void {
  b.box([-kPlinthHalf - 1, GROUND, -kPlinthHalf - 1], [kPlinthHalf + 1, GROUND, kPlinthHalf + 1], B.ashlar);
  b.fill([-kPlinthHalf, kFloor, -kPlinthHalf], [kPlinthHalf, kFloor, kPlinthHalf], (x, _y, z) => (
    ring(x, z) >= kTiers[0].half - kWall ? B.ashlar : B.flagstone
  ));
}

/**
 * A tier is a thick shell: a frieze course at its foot, brick walls with
 * limestone pilasters and a coping, and a roof only where the next tier
 * stands on it. The summit tier is roofed but for an oculus.
 */
function buildTier(
  b: Brush,
  { half, bottom, top }: Tier,
  summit: boolean
): void {
  const nextHalf = half - 5;

  b.fill([-half, bottom, -half], [half, top, half], (x, y, z) => {
    const r = ring(x, z);
    const outer = r === half;
    if (r > half - kWall) {
      if (outer && y === bottom) {
        return B.trim;
      }
      if (outer && y === top) {
        return B.limestone;
      }
      const along = Math.abs(x) === half ? z : x;

      return outer && along % 6 === 0 ? B.limestone : B.sandstone;
    }
    if (y !== top) {
      return undefined;
    }
    if (summit) {
      return r <= 1 ? undefined : B.ashlar;
    }

    return r >= nextHalf - kWall ? B.flagstone : undefined;
  });
}

/**
 * Upside-down stairs leaning on the top course: an overhanging moulding.
 */
function buildCornice(
  b: Brush,
  { half, top }: Tier
): void {
  const edge = half + 1;

  for (let i = -half; i <= half; i++) {
    b.put([edge, top, i], B.ashlar.stair, { ...rising("W"), flipY: true });
    b.put([-edge, top, i], B.ashlar.stair, { ...rising("E"), flipY: true });
    b.put([i, top, edge], B.ashlar.stair, { ...rising("N"), flipY: true });
    b.put([i, top, -edge], B.ashlar.stair, { ...rising("S"), flipY: true });
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.put([sx * edge, top, sz * edge], B.ashlar.stairCornerOuter, { ...outerCorner("stair", -sx, -sz), flipY: true });
  }
}

/**
 * The walk around `upper`, on the roof of `lower`: a parapet on the outer
 * edge, hedges against the upper wall and, when `planted`, trees on the
 * corners.
 */
function buildTerrace(
  b: Brush,
  lower: Tier,
  upper: Tier,
  planted: boolean
): void {
  const y = upper.bottom;
  const outer = lower.half;
  const inner = upper.half + 1;

  b.fill([-outer, y, -outer], [outer, y, outer], (x, _y, z) => (
    ring(x, z) === outer && !onFlight(x, z) ? B.limestone.slabBottom : undefined
  ));
  for (const side of [-1, 1]) {
    for (const axis of ["x", "z"] as const) {
      // Planter along this side, leaving the stair flights free on the west.
      for (let i = -upper.half + 2; i <= upper.half - 2; i += 6) {
        const [x0, z0] = axis === "x" ? [side * inner, i] : [i, side * inner];
        const [x1, z1] = axis === "x" ? [x0, z0 + 3] : [x0 + 3, z0];
        if (onFlight(x0, z0) || onFlight(x1, z1)) {
          continue;
        }
        hedge(b, [Math.min(x0, x1), y, Math.min(z0, z1)], [Math.max(x0, x1), y, Math.max(z0, z1)]);
      }
    }
  }
  const corner = inner + 2;
  for (const [sx, sz] of planted ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : []) {
    if (upper.half >= 30) {
      broadleafTree(b, [sx * corner, y, sz * corner], 2);
    }
    else {
      acacia(b, [sx * corner, y, sz * corner], 5);
    }
  }
}

function onFlight(
  x: number,
  z: number
): boolean {
  return x < 0 && kFlightLanes.some(([z0, z1]) => z >= z0 - 1 && z <= z1 + 1);
}

/**
 * Two flights up the west face to the summit, each resting on a solid mass
 * and walled by dark stringers, as in inspiration v3.
 */
function buildFlights(
  b: Brush
): void {
  for (let x = GROUND - kFlightOffset; x <= -kSummit.half - 1; x++) {
    const y = x + kFlightOffset;
    for (const [z0, z1] of kFlightLanes) {
      for (let z = z0 - 1; z <= z1 + 1; z++) {
        const stringer = z < z0 || z > z1;
        const floor = surfaceAt(ring(x, z));
        b.box([x, floor, z], [x, y - 1, z], stringer ? B.trim : B.ashlar);
        if (stringer) {
          b.box([x, y, z], [x, y + 1, z], B.trim);
        }
        else {
          b.put([x, y, z], B.sandstone.stair, rising("E"));
        }
      }
    }
  }
}

/**
 * A tall door through the west wall, framed in granite under a gold and
 * lapis lintel, with one step up from the path.
 */
function buildDoorway(
  b: Brush
): void {
  const face = -kTiers[0].half - 1;

  b.clear([-kTiers[0].half, kFloor + 1, -2], [-kTiers[0].half + kWall, kFloor + 5, 2]);
  b.box([-kTiers[0].half, kFloor, -2], [-kTiers[0].half + kWall, kFloor, 2], B.flagstone);
  for (const z of [-3, 3]) {
    b.box([face, kFloor + 1, z], [face, kFloor + 6, z], B.granite);
  }
  b.box([face, kFloor + 6, -3], [face, kFloor + 6, 3], B.granite);
  b.box([face, kFloor + 7, -3], [face, kFloor + 7, 3], B.gold);
  b.put([face, kFloor + 7, 0], B.lapis);
  for (let z = -4; z <= 4; z++) {
    b.put([-kPlinthHalf, kFloor, z], B.sandstone.stair, rising("E"));
  }
}

/**
 * The atrium: a flagstone floor under the stepped hollow of the tiers, a
 * tree court with a pool under the oculus, colonnades, and a tomb hall on
 * either side lit by braziers.
 */
function buildInterior(
  b: Brush,
  random: Random
): void {
  basin(b, [0, kFloor, 0], 4);
  for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
    acacia(b, [x, kFloor + 1, z], 7);
  }
  for (let x = -36; x <= 36; x += 6) {
    for (const z of [-14, 14]) {
      column(b, [x, kFloor + 1, z], { height: 12, stone: B.tombGranite });
    }
  }
  for (const z of [-28, 28]) {
    for (const x of [-30, -18, -6, 6, 18, 30]) {
      sarcophagus(b, [x, kFloor + 1, z]);
    }
    for (const x of [-38, 38]) {
      brazier(b, [x, kFloor + 1, z], true);
    }
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(random() * 64) - 32;
    b.put([x, kFloor + 1, random() > 0.5 ? 36 : -36], B.gold.slabBottom);
  }
}

/**
 * Four columns on the summit carrying an entablature and a gold pyramidion.
 */
function buildShrine(
  b: Brush
): void {
  const floor = kSummit.top + 1;

  for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    column(b, [x, floor, z], { height: 6 });
  }
  b.box([-5, floor + 6, -5], [5, floor + 6, 5], B.limestone);
  b.box([-5, floor + 7, -5], [5, floor + 7, 5], B.trim);
  pyramidion(b, [0, floor + 8, 0], 5);
}

/**
 * A pool on the east plinth feeding a channel that runs to the rim and
 * falls off into the clouds, among acacias on the sand.
 */
function buildOasis(
  b: Brush,
  island: FloatingIsland,
  random: Random
): void {
  const rim = Math.floor(island.radiusToward(1, 0));
  basin(b, [kPlinthHalf + 4, GROUND - 1, 0], 2);
  for (let x = kPlinthHalf + 7; x <= rim + 1; x++) {
    b.put([x, GROUND - 1, -2], B.limestone);
    b.put([x, GROUND - 1, 2], B.limestone);
    b.clear([x, GROUND - 1, -1], [x, GROUND - 1, 1]);
    b.box([x, GROUND - 2, -1], [x, GROUND - 2, 1], B.faience);
  }
  const channelStart = kPlinthHalf + 7;
  b.pool([(channelStart + rim) / 2, GROUND - 0.2, 0], rim - channelStart + 1, 3);
  b.waterfall([rim + 0.6, GROUND - 22, 0], 3, 44);

  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    obelisk(b, [sx * 58, GROUND, sz * 40], 14);
  }
  for (let i = 0; i < 8; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 60 + random() * 12;
    const [x, z] = [Math.round(Math.cos(angle) * distance), Math.round(Math.sin(angle) * distance)];
    const surface = island.surfaceAt(x, z);
    if (surface !== undefined && Math.abs(z) > 3 && ring(x, z) > kPlinthHalf + 2) {
      acacia(b, [x, surface, z], 5 + Math.floor(random() * 3));
    }
  }
}
