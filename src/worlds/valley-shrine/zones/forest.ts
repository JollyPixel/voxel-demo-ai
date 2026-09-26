// Import Internal Dependencies
import type { Brush } from "../../../core/builder/Brush.ts";
import { hash } from "../../../core/utils/noise.ts";
import type { Random } from "../../../core/utils/random.ts";
import {
  cherry,
  maple,
  petals,
  pine
} from "../prefabs/trees.ts";
import { FLOOR, HALF_SIZE, SITE } from "../site.ts";
import { groundAt, TERRAIN } from "../terrain.ts";

// CONSTANTS
const kSpacing = 7;
/**
 * Trees give way to bare rock and snow above this height.
 */
const kTreeLine = 120;

/**
 * Trees on the mountainsides: black pines on every ledge wide enough to hold
 * one, a few cherries and maples on the lower slopes, and a pine on each
 * rock pillar. In the valley, cherry groves on the open meadows.
 */
export function buildForest(
  b: Brush,
  random: Random
): void {
  buildGroves(b, random);

  for (let z = -HALF_SIZE; z <= HALF_SIZE; z += kSpacing) {
    for (let x = -HALF_SIZE; x <= HALF_SIZE; x += kSpacing) {
      const px = x + Math.floor(random() * kSpacing);
      const pz = z + Math.floor(random() * kSpacing);
      const ground = TERRAIN.surfaceAt(px, pz);
      if (ground === undefined || ground <= FLOOR + 3 || ground > kTreeLine || !level(px, pz, ground)) {
        continue;
      }
      const pick = hash(px, ground, pz, 60);
      if (pick > 0.7) {
        continue;
      }
      if (ground < FLOOR + 30 && pick < 0.08) {
        cherry(b, [px, ground, pz], 4);
      }
      else if (ground < FLOOR + 30 && pick < 0.13) {
        maple(b, [px, ground, pz], 3);
      }
      else {
        pine(b, [px, ground, pz], 6 + Math.floor(random() * 5));
      }
    }
  }

  for (const pillar of SITE.pillars) {
    const ground = TERRAIN.surfaceAt(pillar.x, pillar.z);
    if (ground !== undefined) {
      pine(b, [pillar.x, ground, pillar.z], 8);
    }
  }
}

/**
 * Cherries on a loose grid over each grove, with a maple here and there,
 * skipping the stream and its banks.
 */
function buildGroves(
  b: Brush,
  random: Random
): void {
  for (const [x0, z0, x1, z1] of SITE.groves) {
    for (let z = z0; z <= z1; z += 12) {
      for (let x = x0; x <= x1; x += 12) {
        const px = x + Math.floor(random() * 6);
        const pz = z + Math.floor(random() * 6);
        const pick = random();
        if (!dry(px, pz) || pick > 0.85) {
          continue;
        }
        if (pick < 0.7) {
          const size = 4 + Math.floor(random() * 3);
          petals(b, [px, pz], size + 2);
          cherry(b, [px, FLOOR, pz], size);
        }
        else {
          maple(b, [px, FLOOR, pz], 3);
        }
      }
    }
  }
}

/**
 * Whether the valley floor around (x, z) is dry for four voxels around.
 */
function dry(
  x: number,
  z: number
): boolean {
  for (let dz = -4; dz <= 4; dz += 2) {
    for (let dx = -4; dx <= 4; dx += 2) {
      if (groundAt(x + dx, z + dz) !== FLOOR) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Whether the ground around (x, z) is flat enough to root a tree: no
 * neighbour within two voxels in height.
 */
function level(
  x: number,
  z: number,
  ground: number
): boolean {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const neighbour = TERRAIN.surfaceAt(x + dx, z + dz);
    if (neighbour === undefined || Math.abs(neighbour - ground) > 2) {
      return false;
    }
  }

  return true;
}
