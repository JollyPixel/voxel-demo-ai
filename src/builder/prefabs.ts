// Import Internal Dependencies
import { B, type Block } from "../blocks/index.ts";
import { hash } from "../utils/noise.ts";
import type { Random } from "../utils/random.ts";
import type { Brush, Vec3 } from "./Brush.ts";
import {
  DIRECTIONS,
  outerCorner,
  rising,
  type Direction
} from "./orientation.ts";

// CONSTANTS
const kFlowers = [B.roseFlower, B.lilacFlower, B.sunFlower];
const kDiagonals = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

export interface ColumnOptions {
  /**
   * From the base slab to the abacus, both included.
   * @default 8
   */
  height?: number;
  /**
   * @default B.limestone
   */
  stone?: Block;
}

/**
 * Egyptian column: a slab base, a banded shaft and a flared papyrus capital
 * under a square abacus.
 */
export function column(
  b: Brush,
  [x, y, z]: Vec3,
  options: ColumnOptions = {}
): void {
  const { height = 8, stone = B.limestone } = options;
  const abacus = y + height - 1;
  const capital = abacus - 1;

  b.box([x - 1, y, z - 1], [x + 1, y, z + 1], B.limestone.slabBottom);
  b.box([x, y, z], [x, capital, z], stone);
  b.put([x, y + 2, z], B.lapis);
  b.put([x, capital - 2, z], B.gold);

  // Upside-down stairs lean back against the shaft, so the capital widens upwards.
  for (const [direction, [dx, dz]] of Object.entries(DIRECTIONS)) {
    b.put([x + dx, capital, z + dz], B.ashlar.stair, { ...rising(opposite(direction as Direction)), flipY: true });
  }
  for (const [dx, dz] of kDiagonals) {
    b.put([x + dx, capital, z + dz], B.ashlar.stairCornerOuter, { ...outerCorner("stair", -dx, -dz), flipY: true });
  }
  b.box([x - 1, abacus, z - 1], [x + 1, abacus, z + 1], B.limestone);
}

function opposite(
  direction: Direction
): Direction {
  const opposites: Record<Direction, Direction> = { N: "S", S: "N", E: "W", W: "E" };

  return opposites[direction];
}

/**
 * Columns every five voxels along x under an architrave, a frieze and a
 * slab cornice.
 */
export function colonnade(
  b: Brush,
  [x0, y, z]: Vec3,
  x1: number,
  height = 8
): void {
  const last = x0 + Math.floor((x1 - x0) / 5) * 5;
  for (let x = x0; x <= last; x += 5) {
    column(b, [x, y, z], { height });
  }
  const top = y + height;
  b.box([x0 - 1, top, z], [last + 1, top, z], B.limestone);
  b.box([x0 - 1, top + 1, z], [last + 1, top + 1, z], B.trim);
  b.box([x0 - 1, top + 2, z - 1], [last + 1, top + 2, z + 1], B.limestone.slabBottom);
}

/**
 * Two banded pylons joined by a semicircular span with a faience intrados,
 * after inspiration v4: stepped plinth, thick shaft, capital, slimmer upper
 * shaft, then the curve, smoothed with stairs above and below.
 */
export function monumentalArch(
  b: Brush,
  [x, y, z]: Vec3,
  halfSpan = 7
): void {
  const springLine = y + 16;

  for (const side of [-1, 1]) {
    const pz = z + side * halfSpan;
    b.box([x - 2, y, pz - 2], [x + 2, y, pz + 2], B.limestone);
    b.box([x - 1, y + 1, pz - 1], [x + 1, y + 1, pz + 1], B.limestone);
    b.box([x - 1, y + 2, pz - 1], [x + 1, y + 9, pz + 1], B.ashlar);
    for (const band of [y + 4, y + 7]) {
      b.box([x - 1, band, pz - 1], [x + 1, band, pz + 1], B.lapis);
    }
    b.box([x - 2, y + 10, pz - 2], [x + 2, y + 10, pz + 2], B.trim);
    b.box([x - 2, y + 11, pz - 2], [x + 2, y + 11, pz + 2], B.limestone.slabBottom);
    b.box([x, y + 11, pz], [x, springLine - 1, pz], B.ashlar);
    b.box([x - 1, springLine - 1, pz - 1], [x + 1, springLine - 1, pz + 1], B.trim);
  }

  archSpan(b, [x, springLine, z], halfSpan);
}

/**
 * A semicircle in the y/z plane, three voxels deep along x.
 */
function archSpan(
  b: Brush,
  [x, springLine, z]: Vec3,
  halfSpan: number
): void {
  const inner = halfSpan - 1.5;
  const outer = halfSpan + 1.2;
  function radiusOf(dz: number, dy: number): number {
    return Math.hypot(dz, dy + 0.5);
  }

  for (let dy = 0; dy <= outer + 1; dy++) {
    for (let dz = -Math.ceil(outer) - 1; dz <= Math.ceil(outer) + 1; dz++) {
      const radius = radiusOf(dz, dy);
      const cell: Vec3 = [x, springLine + dy, z + dz];
      const rise = rising(dz > 0 ? "N" : "S");

      if (radius <= inner) {
        continue;
      }
      if (radius <= inner + 1) {
        b.box([x - 1, cell[1], cell[2]], [x + 1, cell[1], cell[2]], B.faience);
      }
      else if (radius <= outer) {
        b.box([x - 1, cell[1], cell[2]], [x + 1, cell[1], cell[2]], B.ashlar);
      }
      else if (radiusOf(dz, dy - 1) <= outer && dz !== 0) {
        // Extrados: a stair on each step, climbing towards the crown.
        for (let dx = -1; dx <= 1; dx++) {
          b.put([x + dx, cell[1], cell[2]], B.ashlar.stair, rise);
        }
      }
      else if (radiusOf(dz, dy - 1) <= outer) {
        b.box([x - 1, cell[1], cell[2]], [x + 1, cell[1], cell[2]], B.ashlar.slabBottom);
      }
    }
  }
}

/**
 * Two columns either side of `position` along `axis`, under a lintel.
 */
export function gateway(
  b: Brush,
  [x, y, z]: Vec3,
  axis: "x" | "z"
): void {
  function along(offset: number, dy = 0): Vec3 {
    return axis === "x" ? [x + offset, y + dy, z] : [x, y + dy, z + offset];
  }

  column(b, along(-4), { height: 7 });
  column(b, along(4), { height: 7 });
  b.box(along(-5, 7), along(5, 7), B.limestone);
  b.box(along(-4, 8), along(4, 8), B.trim);
  b.box(along(-3, 9), along(3, 9), B.limestone.slabBottom);
  b.put(along(0, 8), B.carved);
}

/**
 * Square pyramid of `half` + 1 layers, with ramps on its faces and ramp
 * corners on its edges, standing on `position`.
 */
export function pyramidion(
  b: Brush,
  [x, y, z]: Vec3,
  half: number,
  material: typeof B.gold | typeof B.sandstone = B.gold
): void {
  for (let layer = 0; layer <= half; layer++) {
    const size = half - layer;
    const cy = y + layer;
    if (size === 0) {
      b.put([x, cy, z], material.slabBottom);
      break;
    }
    b.box([x - size + 1, cy, z - size + 1], [x + size - 1, cy, z + size - 1], material);
    for (let i = -size + 1; i < size; i++) {
      b.put([x + size, cy, z + i], material.ramp, rising("W"));
      b.put([x - size, cy, z + i], material.ramp, rising("E"));
      b.put([x + i, cy, z + size], material.ramp, rising("N"));
      b.put([x + i, cy, z - size], material.ramp, rising("S"));
    }
    for (const [sx, sz] of kDiagonals) {
      b.put([x + sx * size, cy, z + sz * size], material.rampCornerOuter, outerCorner("ramp", -sx, -sz));
    }
  }
}

/**
 * Granite needle on a stepped base, tipped with gold.
 */
export function obelisk(
  b: Brush,
  [x, y, z]: Vec3,
  height = 9
): void {
  b.box([x - 1, y, z - 1], [x + 1, y, z + 1], B.granite);
  b.box([x, y + 1, z], [x, y + height - 1, z], B.granite);
  b.put([x, y + 3, z], B.gold);
  b.put([x, y + height, z], B.gold.slabBottom);
}

/**
 * Date palm: a trunk leaning a little, crowned by drooping fronds.
 */
export function palm(
  b: Brush,
  [x, y, z]: Vec3,
  height = 7
): void {
  const [leanX, leanZ] = Object.values(DIRECTIONS)[Math.floor(hash(x, y, z, 5) * 4)];
  let [tx, tz] = [x, z];

  for (let dy = 0; dy < height; dy++) {
    if (dy === Math.floor(height * 0.6)) {
      [tx, tz] = [tx + leanX, tz + leanZ];
    }
    b.put([tx, y + dy, tz], B.palmTrunk.poleY);
  }
  const crown = y + height;
  b.put([tx, crown, tz], B.leaves);
  for (const [dx, dz] of [...Object.values(DIRECTIONS), ...kDiagonals]) {
    b.put([tx + dx, crown, tz + dz], B.frond);
  }
  for (const [dx, dz] of Object.values(DIRECTIONS)) {
    b.put([tx + dx * 2, crown - 1, tz + dz * 2], B.frond);
    b.put([tx + dx * 3, crown - 2, tz + dz * 3], B.frond);
  }
  b.put([tx, crown + 1, tz], B.frond);
}

/**
 * Round broadleaf tree: a short trunk under a lumpy ellipsoid canopy.
 */
export function broadleafTree(
  b: Brush,
  [x, y, z]: Vec3,
  size = 3
): void {
  const trunk = size + 2;
  const centre = y + trunk + 1;

  b.box([x, y, z], [x, y + trunk, z], B.trunk);
  b.fill(
    [x - size - 1, centre - size, z - size - 1],
    [x + size + 1, centre + size, z + size + 1],
    (cx, cy, cz) => {
      const d = Math.hypot((cx - x) / (size + 0.8), (cy - centre) / (size * 0.8), (cz - z) / (size + 0.8));

      return d + hash(cx, cy, cz, 6) * 0.35 < 1.05 ? B.leaves : undefined;
    }
  );
}

/**
 * Low clipped hedge over the inclusive footprint `from`..`to`.
 */
export function hedge(
  b: Brush,
  from: Vec3,
  to: Vec3
): void {
  b.box(from, to, B.leaves);
}

/**
 * Soil under the footprint `from`..`to`, planted with flowers of one random
 * colour.
 */
export function flowerBed(
  b: Brush,
  [x0, y, z0]: Vec3,
  [x1, , z1]: Vec3,
  random: Random
): void {
  const flower = kFlowers[Math.floor(random() * kFlowers.length)];

  b.box([x0, y - 1, z0], [x1, y - 1, z1], B.soil);
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      if (random() > 0.2) {
        b.put([x, y, z], flower, { rotation: Math.floor(random() * 4) });
      }
    }
  }
}

/**
 * Sunken square pool: a faience floor one voxel down, a stone kerb around it
 * and a water surface just under the kerb.
 */
export function basin(
  b: Brush,
  [x, y, z]: Vec3,
  half: number
): void {
  b.box([x - half - 1, y, z - half - 1], [x + half + 1, y, z + half + 1], B.limestone);
  b.clear([x - half, y, z - half], [x + half, y, z + half]);
  b.box([x - half, y - 1, z - half], [x + half, y - 1, z + half], B.faience);
  b.pool([x, y + 0.8, z], half * 2 + 1, half * 2 + 1);
}

export function sarcophagus(
  b: Brush,
  [x, y, z]: Vec3
): void {
  b.box([x - 1, y, z - 2], [x + 1, y, z + 2], B.tombGranite);
  b.box([x - 1, y + 1, z - 2], [x + 1, y + 1, z + 2], B.gold);
  for (let dz = -2; dz <= 2; dz++) {
    b.put([x - 1, y + 2, z + dz], B.tombGranite.ramp, rising("E"));
    b.put([x, y + 2, z + dz], B.tombGranite);
    b.put([x + 1, y + 2, z + dz], B.tombGranite.ramp, rising("W"));
  }
}

/**
 * Stone post with a gold bowl; `lit` adds a warm point light above it.
 */
export function brazier(
  b: Brush,
  [x, y, z]: Vec3,
  lit = false
): void {
  b.put([x, y, z], B.granite);
  b.put([x, y + 1, z], B.tombGranite.poleY);
  b.put([x, y + 2, z], B.gold.slabBottom);
  if (lit) {
    b.light([x, y + 3.5, z], { color: "#ffa34a", intensity: 30, distance: 22 });
  }
}
