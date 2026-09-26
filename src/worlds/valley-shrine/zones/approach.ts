// Import Internal Dependencies
import type { Brush } from "../../../core/builder/Brush.ts";
import type { Random } from "../../../core/utils/random.ts";
import { B } from "../blocks.ts";
import {
  drumBridge,
  postLantern,
  railing,
  stoneLantern,
  torii
} from "../prefabs/architecture.ts";
import { cherry, maple, petals } from "../prefabs/trees.ts";
import { FLOOR, SITE } from "../site.ts";
import { groundAt } from "../terrain.ts";

// CONSTANTS
const kAxis = SITE.axis;
const kGateFront = SITE.compound.z + SITE.compound.halfZ + 2;
const kBridge = { from: SITE.drumBridge.z - 7, to: SITE.drumBridge.z + 7 };
const kOverlook = { from: SITE.overlook.z, to: SITE.gorge.lip, halfX: 10 };

/**
 * The approach on the main axis, from an overlook on the lip of the gorge,
 * up the gorge under the grand torii, over the drum bridge and along a
 * lantern avenue of cherry trees to the gate.
 */
export function buildApproach(
  b: Brush,
  random: Random
): void {
  buildPath(b);
  drumBridge(b, [kAxis, FLOOR, kBridge.from], kBridge.to, 2, 3);
  torii(b, [kAxis, FLOOR, SITE.grandTorii.z], { half: 7, height: 18, axis: "x", grand: true });
  buildAvenue(b, random);
  buildGorge(b);
  buildOverlook(b);
}

/**
 * Packed earth with a paved centre, on dry ground only.
 */
function buildPath(
  b: Brush
): void {
  b.fill([kAxis - 4, FLOOR - 1, kGateFront], [kAxis + 4, FLOOR - 1, kOverlook.from - 1], (x, _y, z) => {
    if (groundAt(x, z) !== FLOOR || (z >= kBridge.from && z <= kBridge.to)) {
      return undefined;
    }

    return Math.abs(x - kAxis) <= 1 ? B.paving : B.path;
  });
}

/**
 * Stone lanterns in pairs between the gate and the grand torii, with a
 * cherry tree behind every other pair.
 */
function buildAvenue(
  b: Brush,
  random: Random
): void {
  for (let z = kGateFront + 4; z < SITE.grandTorii.z - 6; z += 12) {
    if (z > kBridge.from - 4 && z < kBridge.to + 4) {
      continue;
    }
    for (const side of [-1, 1]) {
      stoneLantern(b, [kAxis + side * 7, FLOOR, z]);
      const tree: [number, number] = [kAxis + side * (14 + Math.round(random() * 3)), z + 6];
      if (groundAt(...tree) === FLOOR) {
        petals(b, tree, 5);
        cherry(b, [tree[0], FLOOR, tree[1]], 5 + Math.floor(random() * 2));
      }
    }
  }
}

/**
 * Post lanterns up the gorge, and maples against its walls.
 */
function buildGorge(
  b: Brush
): void {
  for (let z = SITE.grandTorii.z + 8; z < kOverlook.from - 4; z += 10) {
    for (const side of [-1, 1]) {
      postLantern(b, [kAxis + side * 6, FLOOR, z]);
    }
  }
  for (const [x, z] of [[4, 84], [-24, 100], [8, 118], [-22, 128], [2, 96]] as const) {
    maple(b, [x, groundAt(x, z), z], 3 + (z % 2));
  }
}

/**
 * A paved terrace on the lip over the cloud sea, fenced on the drop, with a
 * torii framing the clouds.
 */
function buildOverlook(
  b: Brush
): void {
  const { from, to, halfX } = kOverlook;

  b.box([kAxis - halfX, FLOOR - 1, from], [kAxis + halfX, FLOOR - 1, to], B.paving);
  b.box([kAxis - halfX - 1, FLOOR, from], [kAxis - halfX - 1, FLOOR, to], B.stone);
  b.box([kAxis + halfX + 1, FLOOR, from], [kAxis + halfX + 1, FLOOR, to], B.stone);
  railing(b, [kAxis - halfX, FLOOR, to], [kAxis + halfX, FLOOR, to], B.vermilion, { every: 4, cap: B.gold.slabBottom });
  torii(b, [kAxis, FLOOR, to - 5], { half: 4, height: 8, axis: "x" });
  for (const side of [-1, 1]) {
    stoneLantern(b, [kAxis + side * (halfX - 2), FLOOR, from + 2]);
  }
}
