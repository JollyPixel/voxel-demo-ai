// Import Internal Dependencies
import { alternateOf, type Block } from "../../core/blocks/registry.ts";
import { Heightfield, type TerrainCell } from "../../core/builder/Heightfield.ts";
import { fbm, hash, lerp, smooth, valueNoise } from "../../core/utils/noise.ts";
import { B } from "./blocks.ts";
import {
  FLOOR,
  HALF_SIZE,
  SHRINE_STAIR,
  SITE
} from "./site.ts";

type Point = readonly [x: number, z: number];

// CONSTANTS
/**
 * The landform is authored, not seeded: the buildings, the stream and the
 * camera views all depend on where the ground is.
 */
const kSeed = 2024;
/**
 * Height of the terraced ledges on the mountainsides.
 */
const kTerrace = 6;
/**
 * Rectangles levelled to the valley floor for the buildings and the
 * avenue, as [x0, z0, x1, z1].
 */
const kPads: readonly (readonly [number, number, number, number])[] = [
  [-50, -86, 30, -8],
  [30, -74, 70, -34],
  [26, -32, 78, -2],
  [-76, -48, -56, -28],
  [SITE.axis - 9, -16, SITE.axis + 9, SITE.gorge.lip],
  [SITE.axis - 12, SITE.overlook.z - 4, SITE.axis + 12, SITE.gorge.lip]
];

/**
 * Ridged value noise in [0, 1): sharp crests where the noise crosses its
 * middle, each octave strongest along the crests of the one before.
 */
function ridged(
  x: number,
  z: number,
  seed: number,
  octaves = 4
): number {
  let sum = 0;
  let total = 0;
  let amplitude = 1;
  let weight = 1;
  for (let octave = 0; octave < octaves; octave++) {
    const scale = 2 ** octave;
    const crest = (1 - Math.abs(valueNoise(x * scale, z * scale, seed + octave * 101) * 2 - 1)) ** 2;
    sum += crest * amplitude * weight;
    total += amplitude;
    weight = Math.min(1, crest * 1.6);
    amplitude /= 2;
  }

  return sum / total;
}

function clamp01(
  t: number
): number {
  return Math.max(0, Math.min(1, t));
}

function smoothstep(
  from: number,
  to: number,
  t: number
): number {
  return smooth(clamp01((t - from) / (to - from)));
}

/**
 * Horizontal distance from the valley's edge, negative inside the valley
 * or the gorge.
 */
function valleyDistance(
  x: number,
  z: number
): number {
  const { valley, gorge } = SITE;
  const dx = (x - valley.x) / valley.rx;
  const dz = (z - valley.z) / valley.rz;
  const angle = Math.atan2(dz, dx);
  const wobble = 1 + (fbm(Math.cos(angle) * 1.6 + 5, Math.sin(angle) * 1.6 + 5, kSeed, 3) - 0.5) * 0.24;
  const inValley = (Math.hypot(dx, dz) / wobble - 1) * 92;
  if (z < gorge.from) {
    return inValley;
  }
  const walls = gorge.halfWidth + (fbm(z / 14, 3.5, kSeed + 1, 3) - 0.5) * 12;

  return Math.min(inValley, Math.abs(x - gorge.x) - walls);
}

/**
 * Where the island ends: a rounded square with a ragged outline.
 */
function rimRadius(
  x: number,
  z: number
): number {
  const angle = Math.atan2(z, x);

  return HALF_SIZE - 4 - fbm(Math.cos(angle) * 3 + 20, Math.sin(angle) * 3 + 20, kSeed + 2, 3) * 16;
}

/**
 * The natural landform: a flat valley floor rolling a little near its edge,
 * then mountains rising steeply in terraced ledges to ridged peaks, tallest
 * in the north, and sinking again towards the rim.
 */
function landform(
  x: number,
  z: number
): number | undefined {
  const { gorge } = SITE;
  const distance = valleyDistance(x, z);
  if (z >= gorge.from && Math.abs(x - gorge.x) < gorge.halfWidth + 10 && distance <= 4) {
    return z <= gorge.lip ? FLOOR + Math.max(0, distance) : undefined;
  }
  const s = Math.sqrt(Math.sqrt(x ** 4 + z ** 4));
  const rim = rimRadius(x, z);
  if (s > rim) {
    return undefined;
  }
  if (distance <= 0) {
    const rolling = Math.max(0, (distance + 14) / 14) * fbm(x / 10, z / 10, kSeed + 3) * 4;

    return FLOOR + Math.floor(rolling);
  }

  const north = 1 + clamp01(-z / HALF_SIZE) * 0.35 - clamp01(z / HALF_SIZE) * 0.3;
  /*
   * Green foothills, then rock climbing steeply to the ridges. The climb is
   * warped, so spurs reach into the valley between coves of foothills.
   */
  const foothills = 24 * smoothstep(0, 30, distance) * (0.6 + fbm(x / 20, z / 20, kSeed + 13) * 0.8);
  const spurs = distance + (fbm(x / 34, z / 34, kSeed + 14) - 0.5) * 70;
  const peaks = (48 + ridged(x / 58, z / 58, kSeed + 4) * 125) * north;
  const rise = smoothstep(8, 62, spurs);
  let elevation = foothills + peaks * rise + (fbm(x / 8, z / 8, kSeed + 5, 3) - 0.5) * 12 * rise;

  const k = elevation / kTerrace;
  const stepped = (Math.floor(k) + smoothstep(0.3, 0.7, k - Math.floor(k))) * kTerrace;
  elevation = lerp(elevation, stepped, 0.65);

  // Near the rim the ridges sink towards the clouds.
  const taper = smoothstep(rim - 28, rim, s);
  elevation = elevation * (1 - taper) - 34 * taper * smoothstep(0, 12, distance);

  return FLOOR + elevation;
}

function distanceToPolyline(
  x: number,
  z: number,
  points: readonly Point[]
): number {
  let best = Infinity;
  for (let index = 1; index < points.length; index++) {
    const [ax, az] = points[index - 1];
    const [bx, bz] = points[index];
    const [dx, dz] = [bx - ax, bz - az];
    const t = clamp01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }

  return best;
}

/**
 * How far below the floor the water carves the ground at (x, z): 3 in the
 * deep of the pools, 2 in a stream bed, 1 on the shallow shelf along the
 * banks, 0 on dry land.
 */
function waterDepth(
  x: number,
  z: number
): number {
  const { cascade, pond, river, outlet, riverHalfWidth } = SITE;
  let depth = 0;

  const stream = Math.min(distanceToPolyline(x, z, river), distanceToPolyline(x, z, outlet));
  if (stream <= riverHalfWidth) {
    depth = 2;
  }
  else if (stream <= riverHalfWidth + 1.3) {
    depth = 1;
  }

  const plunge = Math.hypot(x - (cascade.x - cascade.pool), z - cascade.z);
  if (plunge <= cascade.pool) {
    depth = 3;
  }
  else if (plunge <= cascade.pool + 1.3) {
    depth = Math.max(depth, 1);
  }

  const angle = Math.atan2(z - pond.z, x - pond.x);
  const wobble = 1 + (fbm(Math.cos(angle) * 2 + 40, Math.sin(angle) * 2 + 40, kSeed + 6, 3) - 0.5) * 0.3;
  const shore = Math.hypot((x - pond.x) / pond.rx, (z - pond.z) / pond.rz) / wobble;
  const island = Math.hypot(x - pond.island.x, z - pond.island.z);
  if (island <= pond.island.radius + 1) {
    return 0;
  }
  if (shore <= 0.7) {
    depth = 3;
  }
  else if (shore <= 1) {
    depth = Math.max(depth, 2);
  }
  else if (shore <= 1 + 1.3 / pond.rz) {
    depth = Math.max(depth, 1);
  }

  return depth;
}

/**
 * First air cell above the ground at (x, z), or undefined past the rim.
 */
export function heightAt(
  x: number,
  z: number
): number | undefined {
  const natural = landform(x, z);
  if (natural === undefined) {
    return undefined;
  }
  let height = natural;

  for (const [x0, z0, x1, z1] of kPads) {
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) {
      height = FLOOR;
    }
  }

  for (const pillar of SITE.pillars) {
    const distance = Math.hypot(x - pillar.x, z - pillar.z) + (fbm(x / 3, z / 3, kSeed + 7, 2) - 0.5) * 3;
    if (distance < pillar.radius) {
      // Stacked tiers, each narrower than the one below, ledged with grass.
      const tier = Math.floor((distance / pillar.radius) ** 1.4 * 4);
      height = Math.max(height, pillar.top - tier * (pillar.top - FLOOR) * 0.2);
    }
  }

  // The shrine's ledge, and the stair cut up to it.
  const { shrine } = SITE;
  const ledge = Math.hypot(x - shrine.x, z - shrine.z);
  if (ledge <= shrine.radius) {
    height = shrine.y;
  }
  else {
    height = Math.max(height, shrine.y - (ledge - shrine.radius) * 2.2);
  }
  if (Math.abs(x - shrine.x) <= shrine.stairHalf + 1 && z <= SHRINE_STAIR.zStart && z > SHRINE_STAIR.zEnd) {
    height = FLOOR + (SHRINE_STAIR.zStart - z);
  }

  // A rock bluff in the east with a notch the stream spills from.
  const { cascade } = SITE;
  const across = Math.abs(z - cascade.z) + (fbm(x / 5, z / 5, kSeed + 12, 2) - 0.5) * 4;
  if (x >= cascade.x && x <= cascade.x + 40) {
    height = Math.max(height, cascade.top - Math.max(0, across - 8) * 3);
    if (Math.abs(z - cascade.z) <= 2 && x <= cascade.x + 22) {
      height = Math.min(height, cascade.top - 3);
    }
  }
  else if (x >= cascade.x - 24 && x < cascade.x && Math.abs(z - cascade.z) <= 14) {
    height = Math.min(height, FLOOR);
  }

  const depth = waterDepth(x, z);
  if (depth > 0 && height <= FLOOR + 2) {
    height = FLOOR - depth;
  }

  return Math.round(height);
}

/**
 * Surface of the cascade's notch: the water spills over at `cascade.x`.
 */
export const CASCADE_WATER = SITE.cascade.top - 2.4;

/*
 * Rock strata: every band of voxels takes one material and one tile, so
 * faces within a band stay mergeable.
 */
const kStrata: readonly Block[][] = [B.rock, B.rock, B.rock, B.paleRock, B.rock, B.rock, B.paleRock, B.darkRock].map(
  (block) => block.ids.map((_, index) => alternateOf(block, index))
);

function snowLine(
  x: number,
  z: number
): number {
  return 128 + (fbm(x / 20, z / 20, kSeed + 8) - 0.5) * 24;
}

function rockAt(
  x: number,
  y: number,
  z: number
): Block {
  const band = Math.floor((y + fbm(x / 23, z / 23, kSeed + 9) * 10) / 7);
  const stratum = kStrata[Math.floor(hash(band, 0, 0, kSeed) * kStrata.length)];

  return stratum[Math.floor(hash(band, x >> 4, z >> 4, kSeed + 1) * stratum.length)];
}

function terrainMaterial(
  { x, y, z, depth, slope }: TerrainCell
): Block {
  const top = y + depth;
  if (top < FLOOR - 1 && top >= FLOOR - 3 && waterDepth(x, z) > 0) {
    return depth === 0 ? B.pebbles : B.dirt;
  }
  if (depth === 0) {
    if (top >= snowLine(x, z) && slope <= 3) {
      return B.snow;
    }
    if (slope <= 1 && top <= FLOOR + 3) {
      return fbm(x / 14, z / 14, kSeed + 10) > 0.6 ? B.meadow : B.grass;
    }
    if (slope <= 1 && top < snowLine(x, z)) {
      return B.grass;
    }

    return slope <= 6 && top < snowLine(x, z) + 8 ? B.mossRock : rockAt(x, y, z);
  }
  if (slope <= 1 && top < snowLine(x, z) && depth <= 2) {
    return B.dirt;
  }

  return rockAt(x, y, z);
}

/**
 * The whole landform, measured once and shared by every zone.
 */
export const TERRAIN = new Heightfield({
  min: [-HALF_SIZE, -HALF_SIZE],
  max: [HALF_SIZE, HALF_SIZE],
  height: heightAt,
  material: terrainMaterial,
  rimBottom: (x, z) => -28 - Math.round(fbm(x / 9, z / 9, kSeed + 11) * 20)
});

/**
 * First air cell above the ground; the valley floor where there is none.
 */
export function groundAt(
  x: number,
  z: number
): number {
  return TERRAIN.surfaceAt(Math.round(x), Math.round(z)) ?? FLOOR;
}
