// Import Internal Dependencies
import type { Brush } from "../../../core/builder/Brush.ts";
import { rising } from "../../../core/builder/orientation.ts";
import type { Random } from "../../../core/utils/random.ts";
import { B } from "../blocks.ts";
import {
  hangingLantern,
  lying,
  railing,
  stoneLantern,
  torii,
  walls
} from "../prefabs/architecture.ts";
import { roof } from "../prefabs/roof.ts";
import { cherry, maple, pine } from "../prefabs/trees.ts";
import { FLOOR, SHRINE_STAIR, SITE } from "../site.ts";
import { groundAt } from "../terrain.ts";

// CONSTANTS
const { shrine } = SITE;
/**
 * The stilted deck on the slope south-east of the ledge, as inclusive
 * cell bounds.
 */
const kDeck = { x0: shrine.x + 6, x1: shrine.x + 18, z0: shrine.z + 4, z1: shrine.z + 16 };

/**
 * Oku-no-in, the inner shrine: a stone stair cut straight up the mountain
 * under a tunnel of torii, a ledge of raked gravel with a small vermilion
 * honden, and a timber deck on stilts over the slope, after Kiyomizu-dera.
 */
export function buildShrine(
  b: Brush,
  _random: Random
): void {
  buildStair(b);
  buildLedge(b);
  buildHonden(b);
  buildDeck(b);
}

function buildStair(
  b: Brush
): void {
  const { stairHalf, x } = shrine;
  const steps = shrine.y - FLOOR;

  for (let step = 0; step < steps; step++) {
    const z = SHRINE_STAIR.zStart - step;
    const y = FLOOR + step;
    for (let dx = -stairHalf; dx <= stairHalf; dx++) {
      b.put([x + dx, y, z], B.stone.stair, rising("N"));
    }
    for (const side of [-1, 1]) {
      b.put([x + side * (stairHalf + 1), y, z], B.stone);
    }
    if (step % 4 === 2) {
      torii(b, [x, y + 1, z], { half: stairHalf + 1, height: 6, axis: "x" });
    }
  }
}

function buildLedge(
  b: Brush
): void {
  const { x, z, y, radius } = shrine;

  b.fill([x - radius, y - 1, z - radius], [x + radius, y - 1, z + radius], (px, _py, pz) => {
    if (Math.hypot(px - x, pz - z) > radius) {
      return undefined;
    }

    return Math.abs(px - x) <= 1 ? B.paving : B.gravel;
  });
  torii(b, [x, y, SHRINE_STAIR.zEnd - 2], { half: 4, height: 8, axis: "x" });
  for (const side of [-1, 1]) {
    stoneLantern(b, [x + side * 4, y, z - 1]);
  }
  cherry(b, [x - 7, y, z - 7], 4);
  pine(b, [x - 9, y, z + 2], 9);
  maple(b, [x + 8, y, z - 8], 3);
}

/**
 * Honden: a vermilion hall on a stone base, shoji between the posts, under
 * a hip-and-gable roof with gold horns.
 */
function buildHonden(
  b: Brush
): void {
  const { x, y } = shrine;
  const z = shrine.z - 5;

  b.box([x - 6, y, z - 5], [x + 6, y, z + 5], B.stone);
  for (let dx = -2; dx <= 2; dx++) {
    b.put([x + dx, y, z + 6], B.stone.stair, rising("N"));
  }
  walls(b, [x, y + 1, z], [5, 4], 6, {
    every: 5,
    panel: (course) => (course >= 4 ? B.plaster : B.shoji)
  });
  hangingLantern(b, [x, y + 5, z + 5]);
  roof(b, [x, y + 8, z], 8, 7, { wall: [5, 4], gable: 2 });
}

/**
 * Kake-zukuri: a cedar deck level with the ledge, carried over the slope on
 * a grid of dark posts braced by beams every six voxels, railed on its open
 * sides.
 */
function buildDeck(
  b: Brush
): void {
  const { x0, x1, z0, z1 } = kDeck;
  const top = shrine.y - 1;

  b.box([x0, top, z0], [x1, top, z1], B.cedar);
  const posts: [number, number][] = [];
  for (let x = x0; x <= x1; x += 4) {
    for (let z = z0; z <= z1; z += 5) {
      posts.push([x, z]);
      const ground = groundAt(x, z);
      if (ground < top) {
        b.box([x, ground, z], [x, top - 1, z], B.darkWood);
      }
    }
  }
  for (let y = top - 6; y > FLOOR; y -= 6) {
    for (const [x, z] of posts) {
      if (x + 1 <= x1 && groundAt(x, z) < y && groundAt(x + 4, z) < y) {
        for (let bx = x + 1; bx < x + 4; bx++) {
          b.put([bx, y, z], B.darkWood.pole, lying("x"));
        }
      }
      if (z + 1 <= z1 && groundAt(x, z) < y && groundAt(x, z + 5) < y) {
        for (let bz = z + 1; bz < z + 5; bz++) {
          b.put([x, y, bz], B.darkWood.pole, lying("z"));
        }
      }
    }
  }
  railing(b, [x1, top + 1, z0], [x1, top + 1, z1], B.vermilion, { every: 4 });
  railing(b, [x0, top + 1, z1], [x1, top + 1, z1], B.vermilion, { every: 4 });
  stoneLantern(b, [x1 - 2, top + 1, z0 + 2]);
}
