// Import Internal Dependencies
import type { Brush } from "../../../core/builder/Brush.ts";
import { rising, type Direction } from "../../../core/builder/orientation.ts";
import type { Random } from "../../../core/utils/random.ts";
import { B } from "../blocks.ts";
import { railing, stoneLantern, walls } from "../prefabs/architecture.ts";
import { roof } from "../prefabs/roof.ts";
import { cherry } from "../prefabs/trees.ts";
import { FLOOR, SITE } from "../site.ts";

// CONSTANTS
/**
 * Half width of each storey's body, from the ground up.
 */
const kBodies = [7, 6, 6, 5, 5];
const kEaveReach = 4;
const kPlinth = 10;
const kSteps: readonly [dx: number, dz: number, climb: Direction][] = [
  [0, 1, "N"], [0, -1, "S"], [1, 0, "W"], [-1, 0, "E"]
];

/**
 * Gojū-no-tō, after inspiration 1: five cedar storeys with plaster panels
 * and shoji, each under wide, shallow eaves on rows of brackets, balconies
 * on the upper storeys, and a ringed gold spire.
 */
export function buildPagoda(
  b: Brush,
  _random: Random
): void {
  const { x, z } = SITE.pagoda;

  b.box([x - kPlinth - 4, FLOOR - 1, z - kPlinth - 4], [x + kPlinth + 4, FLOOR - 1, z + kPlinth + 4], B.gravel);
  b.box([x - kPlinth, FLOOR, z - kPlinth], [x + kPlinth, FLOOR + 1, z + kPlinth], B.stone);
  for (const [dx, dz, climb] of kSteps) {
    for (let across = -2; across <= 2; across++) {
      const [ax, az] = dx === 0 ? [across, 0] : [0, across];
      b.put([x + dx * (kPlinth + 2) + ax, FLOOR, z + dz * (kPlinth + 2) + az], B.stone.stair, rising(climb));
      b.put([x + dx * (kPlinth + 1) + ax, FLOOR, z + dz * (kPlinth + 1) + az], B.stone);
      b.put([x + dx * (kPlinth + 1) + ax, FLOOR + 1, z + dz * (kPlinth + 1) + az], B.stone.stair, rising(climb));
    }
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    stoneLantern(b, [x + sx * (kPlinth + 3), FLOOR, z + sz * (kPlinth + 3)]);
  }

  let y = FLOOR + 2;
  for (const [storey, half] of kBodies.entries()) {
    const height = storey === 0 ? 8 : 6;
    walls(b, [x, y, z], [half, half], height, {
      post: B.cedarPost,
      every: half,
      panel: (course) => (course >= 2 && course <= height - 3 ? B.shoji : B.plaster),
      open: (dx, dz, course) => storey === 0 && course < 5 && Math.abs(dx) <= 1 && Math.abs(dz) === half
    });
    b.box([x - half + 1, y, z - half + 1], [x + half - 1, y, z + half - 1], B.cedar);
    b.fill([x - half, y + height - 1, z - half], [x + half, y + height - 1, z + half], (px, _py, pz) => (
      Math.abs(px - x) === half || Math.abs(pz - z) === half ? B.cedar : undefined
    ));

    const next = kBodies[storey + 1];
    const eave = y + height + 1;
    if (next === undefined) {
      const apex = roof(b, [x, eave, z], half + kEaveReach, half + kEaveReach, { wall: [half, half], ornaments: false });
      spire(b, [x, apex + 1, z]);
      break;
    }
    const top = roof(b, [x, eave, z], half + kEaveReach, half + kEaveReach, { wall: [half, half], until: [next + 1, next + 1] });
    // A balcony walk around the next storey.
    const rail = next + 1;
    for (const [from, to] of [
      [[x - rail, top + 1, z - rail], [x + rail, top + 1, z - rail]],
      [[x - rail, top + 1, z + rail], [x + rail, top + 1, z + rail]],
      [[x - rail, top + 1, z - rail], [x - rail, top + 1, z + rail]],
      [[x + rail, top + 1, z - rail], [x + rail, top + 1, z + rail]]
    ] as const) {
      railing(b, from, to, B.vermilion, { every: rail });
    }
    y = top + 1;
  }

  for (const [sx, sz] of [[1, 1], [-1, -1], [1, -1]]) {
    cherry(b, [x + sx * 19, FLOOR, z + sz * 17], 5);
  }
}

/**
 * Sōrin: a dark base block, nine gold rings on a pole and a tall tip.
 */
function spire(
  b: Brush,
  [x, y, z]: readonly [number, number, number]
): void {
  b.put([x, y, z], B.roofTile);
  for (let ring = 0; ring < 9; ring++) {
    b.put([x, y + 1 + ring * 2, z], B.gold.poleY);
    b.put([x, y + 2 + ring * 2, z], B.gold);
  }
  b.box([x, y + 19, z], [x, y + 22, z], B.gold.poleY);
}
