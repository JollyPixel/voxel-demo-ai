// Import Internal Dependencies
import type { Block } from "../../../core/blocks/registry.ts";
import type { Brush, Vec3 } from "../../../core/builder/Brush.ts";
import type { Random } from "../../../core/utils/random.ts";
import { B } from "../blocks.ts";
import {
  postLantern,
  railing,
  stoneLantern,
  walls
} from "../prefabs/architecture.ts";
import { roof } from "../prefabs/roof.ts";
import {
  azalea,
  bamboo,
  cherry,
  maple,
  petals,
  pine
} from "../prefabs/trees.ts";
import { FLOOR, SITE } from "../site.ts";
import { groundAt } from "../terrain.ts";

type Cell = readonly [x: number, z: number];

// CONSTANTS
/**
 * The zigzag plank walk from the west shore to the island, as inclusive
 * rectangles of cells.
 */
const kZigzag: readonly (readonly [Cell, Cell])[] = [
  [[-76, 28], [-70, 29]],
  [[-71, 28], [-70, 33]],
  [[-71, 32], [-64, 33]],
  [[-65, 32], [-64, 37]],
  [[-65, 36], [-55, 37]]
];
/**
 * The dry garden's rock groups: each rock's footprint corner, size and
 * height, around a group centre ringed with moss.
 */
const kRockGroups: readonly { centre: Cell; rocks: readonly [x: number, z: number, size: number, height: number][]; }[] = [
  { centre: [40, -19], rocks: [[39, -20, 2, 3], [42, -18, 1, 2], [37, -17, 1, 1]] },
  { centre: [56, -12], rocks: [[55, -13, 2, 2], [58, -11, 1, 1]] },
  { centre: [66, -21], rocks: [[65, -22, 2, 4], [63, -20, 1, 2], [68, -19, 1, 1]] }
];

/**
 * The stroll garden around the koi pond, west of the axis: a tea house on
 * stilts, a zigzag plank walk to a pine island, stepping stones over the
 * outlet, lanterns, azaleas, cherries and maples, and a bamboo grove
 * against the foothills. East of the pagoda lies the dry garden.
 */
export function buildGarden(
  b: Brush,
  random: Random
): void {
  buildTeaHouse(b);
  buildZigzag(b);
  buildSteppingStones(b);

  const { island } = SITE.pond;
  pine(b, [island.x, groundAt(island.x, island.z), island.z], 8);
  postLantern(b, [island.x + 2, FLOOR, island.z - 2]);

  stoneLantern(b, [-40, FLOOR, 22]);
  stoneLantern(b, [-78, FLOOR, 40]);
  stoneLantern(b, [-60, FLOOR, 48]);

  for (const [x, z, size] of [[-80, 18, 6], [-46, 16, 5], [-72, 52, 6], [-30, 44, 5], [-50, 60, 5]] as const) {
    petals(b, [x, z], size + 2);
    cherry(b, [x, groundAt(x, z), z], size);
  }
  for (const [x, z] of [[-76, 8], [-40, 40], [-86, 58]] as const) {
    maple(b, [x, groundAt(x, z), z], 4);
  }
  for (let index = 0; index < 14; index++) {
    const angle = (index / 14) * Math.PI * 2 + random() * 0.3;
    const [x, z] = [
      Math.round(SITE.pond.x + Math.cos(angle) * (SITE.pond.rx + 3)),
      Math.round(SITE.pond.z + Math.sin(angle) * (SITE.pond.rz + 3))
    ];
    if (groundAt(x, z) === FLOOR && index % 3 !== 0) {
      azalea(b, [x, FLOOR, z], 1 + Math.floor(random() * 2));
    }
  }
  buildBambooGrove(b, random);
  buildDryGarden(b);
}

/**
 * A small tea house on dark stilts at the pond's north edge: a cedar
 * platform with a railed veranda over the water, shoji walls and a hipped
 * roof.
 */
function buildTeaHouse(
  b: Brush
): void {
  const { x, z } = SITE.teaHouse;
  const floor = FLOOR + 1;

  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -4; dz <= 5; dz++) {
      const ground = groundAt(x + dx, z + dz);
      b.put([x + dx, FLOOR, z + dz], B.cedar);
      if ((Math.abs(dx) === 5 || dx === 0) && (Math.abs(dz) === 4 || dz === 5 || dz === 0) && ground < FLOOR) {
        b.box([x + dx, ground, z + dz], [x + dx, FLOOR - 1, z + dz], B.darkWood.poleY);
      }
    }
  }
  railing(b, [x - 5, floor, z + 5], [x + 5, floor, z + 5], B.cedar);
  walls(b, [x, floor, z - 1], [4, 3], 5, {
    post: B.cedarPost,
    panel: (course) => (course === 4 ? B.plaster : B.shoji),
    open: (dx, dz, course) => dz === 3 && Math.abs(dx) <= 1 && course < 4
  });
  roof(b, [x, floor + 6, z - 1], 7, 6, { wall: [4, 3], eave: 2 });
}

/**
 * Yatsuhashi: planks laid just above the water in a zigzag, on posts at
 * every turn.
 */
function buildZigzag(
  b: Brush
): void {
  for (const [[x0, z0], [x1, z1]] of kZigzag) {
    b.box([x0, FLOOR - 1, z0], [x1, FLOOR - 1, z1], B.cedar.slabTop);
    for (const [x, z] of [[x0, z0], [x1, z1]]) {
      b.box([x, groundAt(x, z), z], [x, FLOOR - 2, z], B.darkWood.poleY);
    }
  }
}

/**
 * Stones across the pond's outlet, their tops level with the banks.
 */
function buildSteppingStones(
  b: Brush
): void {
  for (let step = -4; step <= 4; step += 2) {
    const x = Math.round(-44 - step * 0.8);
    const z = Math.round(49 + step * 0.6);
    const ground = groundAt(x, z);
    if (ground < FLOOR) {
      b.box([x, ground, z], [x, FLOOR - 1, z], B.lanternStone);
    }
  }
}

function buildBambooGrove(
  b: Brush,
  random: Random
): void {
  const { from: [x0, z0], to: [x1, z1] } = SITE.bamboo;
  for (let z = z0; z <= z1; z += 5) {
    for (let x = x0; x <= x1; x += 5) {
      const [px, pz] = [x + Math.round(random() * 3), z + Math.round(random() * 3)];
      const ground = groundAt(px, pz);
      if (ground >= FLOOR && ground <= FLOOR + 8) {
        bamboo(b, [px, ground, pz], 12 + Math.floor(random() * 6));
      }
    }
  }
}

/**
 * Karesansui: raked gravel inside a tile-capped plaster wall, with three
 * groups of standing rocks, each on an island of moss.
 */
function buildDryGarden(
  b: Brush
): void {
  const { from: [x0, z0], to: [x1, z1] } = SITE.dryGarden;
  b.box([x0, FLOOR - 1, z0], [x1, FLOOR - 1, z1], B.gravel);

  b.fill([x0 - 1, FLOOR, z0 - 1], [x1 + 1, FLOOR + 2, z1 + 1], (x, y, z) => {
    const edge = x === x0 - 1 || x === x1 + 1 || z === z0 - 1 || z === z1 + 1;
    const gap = (z === z0 - 1 && Math.abs(x - SITE.pagoda.x) <= 2) || (x === x0 - 1 && Math.abs(z + 17) <= 2);
    if (!edge || gap) {
      return undefined;
    }
    const courses: Block[] = [B.stone, B.plaster, B.roofTile.slabBottom];

    return courses[y - FLOOR];
  });

  for (const { centre: [cx, cz], rocks } of kRockGroups) {
    b.fill([cx - 4, FLOOR - 1, cz - 4], [cx + 4, FLOOR - 1, cz + 4], (x, _y, z) => (
      Math.hypot(x - cx, z - cz) <= 3.6 ? B.moss : undefined
    ));
    for (const [x, z, size, height] of rocks) {
      rock(b, [x, FLOOR, z], size, height);
    }
  }
}

function rock(
  b: Brush,
  [x, y, z]: Vec3,
  size: number,
  height: number
): void {
  b.box([x, y, z], [x + size - 1, y + height - 1, z + size - 1], B.paleRock);
  b.box([x, y + height - 1, z], [x + size - 1, y + height - 1, z + size - 1], B.mossRock);
}
