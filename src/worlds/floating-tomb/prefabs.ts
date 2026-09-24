// Import Internal Dependencies
import type { Block } from "../../core/blocks/registry.ts";
import { B } from "./blocks.ts";
import { hash } from "../../core/utils/noise.ts";
import type { Brush, Vec3 } from "../../core/builder/Brush.ts";
import {
  DIRECTIONS,
  outerCorner,
  rising,
  type Direction
} from "../../core/builder/orientation.ts";

// CONSTANTS
const kDiagonals = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

export interface ColumnOptions {
  /**
   * From the base slab to the abacus, both included.
   * @default 8
   */
  height?: number;
  /**
   * @default B.fluted
   */
  stone?: Block;
}

/**
 * Egyptian column: a slab base, a fluted shaft and a flared papyrus capital
 * under a square abacus.
 */
export function column(
  b: Brush,
  [x, y, z]: Vec3,
  options: ColumnOptions = {}
): void {
  const { height = 8, stone = B.fluted } = options;
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
 * Umbrella acacia: a trunk forking into two or three limbs that lean
 * outwards, each carrying a pad of a broad, flat-topped canopy.
 */
export function acacia(
  b: Brush,
  [x, y, z]: Vec3,
  height = 6
): void {
  const fork = y + Math.floor(height * 0.45);
  const limbs = hash(x, y, z, 7) > 0.5 ? 3 : 2;
  const turn = hash(x, y, z, 8) * Math.PI * 2;

  b.box([x, y, z], [x, fork, z], B.trunk);
  for (let limb = 0; limb < limbs; limb++) {
    const angle = turn + (limb / limbs) * Math.PI * 2;
    const reach = 2 + hash(x, limb, z, 9) * 1.5;
    const tip: Vec3 = [
      x + Math.round(Math.cos(angle) * reach),
      y + height - (limb % 2),
      z + Math.round(Math.sin(angle) * reach)
    ];
    canopyPad(b, tip, 3 + (limb === 0 ? 1 : 0));
    limbBetween(b, [x, fork, z], tip);
  }
}

/**
 * Trunk voxels from `from` to `to`, each step on the axis with the most
 * ground left, so the limb stays face-connected.
 */
function limbBetween(
  b: Brush,
  from: Vec3,
  to: Vec3
): void {
  const cell = [...from];
  while (cell.some((value, axis) => value !== to[axis])) {
    const remaining = cell.map((value, axis) => to[axis] - value);
    const axis = remaining.reduce((best, delta, index) => (Math.abs(delta) > Math.abs(remaining[best]) ? index : best), 0);
    cell[axis] += Math.sign(remaining[axis]);
    b.put([cell[0], cell[1], cell[2]], B.trunk);
  }
}

/**
 * A flat canopy pad: a wide lower layer with a ragged rim under a narrower
 * top, on the layers `y` and `y + 1` around `x, z`.
 */
function canopyPad(
  b: Brush,
  [x, y, z]: Vec3,
  radius: number
): void {
  b.fill([x - radius - 1, y, z - radius - 1], [x + radius + 1, y + 1, z + radius + 1], (cx, cy, cz) => {
    const distance = Math.hypot(cx - x, cz - z);
    const rim = (cy === y ? radius + 0.6 : radius - 0.8) + (hash(cx, cy, cz, 10) - 0.5) * 1.2;

    return distance <= rim ? B.acaciaLeaves : undefined;
  });
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
 * A giant tree: a buttressed trunk whose roots crawl over the ground and dive
 * into it, a full circle of branches arcing up and out to leaf clusters, and
 * a crown dome on top. `[x, y, z]` is the first air cell above the ground.
 */
export function giantTree(
  b: Brush,
  [x, y, z]: Vec3,
  height = 30
): void {
  const top = y + height;
  const branches = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2 + hash(x, index, z, 20) * 0.4;
    const start = y + Math.round(height * (0.45 + hash(x, index, z, 21) * 0.3));
    const reach = 12 + hash(x, index, z, 22) * 6;
    const tip: Vec3 = [
      x + Math.cos(angle) * reach,
      Math.min(top, start + 3 + hash(x, index, z, 23) * 3),
      z + Math.sin(angle) * reach
    ];

    return { angle, start, reach, tip };
  });

  /*
   * Foliage first, so the wood is written over it where they meet. Each
   * cluster sits on its branch tip, leaving the limb bare underneath.
   */
  for (const { tip: [tx, ty, tz] } of branches) {
    leafCluster(b, [tx, ty + 2, tz], 5);
  }
  leafCluster(b, [x, top + 2, z], 7);

  b.fill([x - 7, y - 1, z - 7], [x + 7, top, z + 7], (cx, cy, cz) => {
    const rise = cy - y;
    const radius = 2.7 - (rise / height) * 1 + 3.6 * Math.exp(-rise / 3);
    const distance = Math.hypot(cx - x, cz - z) + (hash(cx, cy, cz, 24) - 0.5) * 0.7;

    return distance < radius ? B.trunk : undefined;
  });

  // Each branch leaves the trunk rising steeply, then bends outwards.
  for (const { angle, start, reach, tip } of branches) {
    const from: Vec3 = [x, start, z];
    const bend: Vec3 = [x + Math.cos(angle) * reach * 0.3, tip[1] + 1, z + Math.sin(angle) * reach * 0.3];
    for (let step = 0; step <= 30; step++) {
      const t = step / 30;
      stamp(b, bezier(from, bend, tip, t), 1.9 - t * 0.9, B.trunk);
    }
  }

  for (let root = 0; root < 11; root++) {
    let angle = (root / 11) * Math.PI * 2 + hash(x, root, z, 25);
    const length = 10 + hash(x, root, z, 26) * 8;
    for (let distance = 2.5; distance <= length; distance += 0.5) {
      const t = distance / length;
      angle += (hash(root, Math.round(distance * 2), 0, 27) - 0.5) * 0.12;
      // A low hump near the trunk, a ripple, then down into the ground.
      const lift = (1 - t) * 1.8 + Math.sin(t * Math.PI * 3) * 0.6 * (1 - t) - t * 1.6;
      stamp(b, [x + Math.cos(angle) * distance, y - 0.6 + lift, z + Math.sin(angle) * distance], 0.9 + (1 - t) * 1.1, B.trunk);
    }
  }
}

function bezier(
  [ax, ay, az]: Vec3,
  [bx, by, bz]: Vec3,
  [cx, cy, cz]: Vec3,
  t: number
): Vec3 {
  const u = 1 - t;

  return [
    u * u * ax + 2 * u * t * bx + t * t * cx,
    u * u * ay + 2 * u * t * by + t * t * cy,
    u * u * az + 2 * u * t * bz + t * t * cz
  ];
}

/**
 * Every cell whose centre lies within `radius` of a point.
 */
function stamp(
  b: Brush,
  [px, py, pz]: Vec3,
  radius: number,
  block: Block
): void {
  const reach = Math.max(radius, 0.9);
  b.fill(
    [Math.floor(px - reach), Math.floor(py - reach), Math.floor(pz - reach)],
    [Math.ceil(px + reach), Math.ceil(py + reach), Math.ceil(pz + reach)],
    (cx, cy, cz) => (Math.hypot(cx - px, cy - py, cz - pz) <= reach ? block : undefined)
  );
}

/**
 * A lumpy, flattened ball of leaves.
 */
function leafCluster(
  b: Brush,
  [px, py, pz]: Vec3,
  radius: number
): void {
  b.fill(
    [Math.floor(px - radius), Math.floor(py - radius), Math.floor(pz - radius)],
    [Math.ceil(px + radius), Math.ceil(py + radius), Math.ceil(pz + radius)],
    (cx, cy, cz) => {
      const d = Math.hypot((cx - px) / radius, (cy - py) / (radius * 0.6), (cz - pz) / radius);

      return d + hash(cx, cy, cz, 28) * 0.3 < 1.05 ? B.leaves : undefined;
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
