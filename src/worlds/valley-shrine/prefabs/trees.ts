// Import Internal Dependencies
import type { Block } from "../../../core/blocks/registry.ts";
import type { Brush, Vec3 } from "../../../core/builder/Brush.ts";
import { hash } from "../../../core/utils/noise.ts";
import { B } from "../blocks.ts";
import { FLOOR } from "../site.ts";
import { groundAt } from "../terrain.ts";

/**
 * Every cell whose centre lies within `radius` of a point.
 */
function stamp(
  b: Brush,
  [px, py, pz]: Vec3,
  radius: number,
  block: Block
): void {
  const reach = Math.max(radius, 0.5);
  b.fill(
    [Math.floor(px - reach), Math.floor(py - reach), Math.floor(pz - reach)],
    [Math.ceil(px + reach), Math.ceil(py + reach), Math.ceil(pz + reach)],
    (cx, cy, cz) => (Math.hypot(cx - px, cy - py, cz - pz) <= reach ? block : undefined)
  );
}

/**
 * Wood along a straight segment, thick enough to stay face-connected.
 */
function limb(
  b: Brush,
  from: Vec3,
  to: Vec3,
  radius: number,
  block: Block
): void {
  const steps = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) * 2);
  for (let step = 0; step <= steps; step++) {
    const t = step / Math.max(1, steps);
    stamp(b, [
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t
    ], radius, block);
  }
}

/**
 * A lumpy flattened ball of foliage; `pick` chooses the block per cell, or
 * leaves it be.
 */
function cluster(
  b: Brush,
  [px, py, pz]: Vec3,
  radius: number,
  squash: number,
  pick: (x: number, y: number, z: number) => Block | undefined
): void {
  b.fill(
    [Math.floor(px - radius), Math.floor(py - radius * squash), Math.floor(pz - radius)],
    [Math.ceil(px + radius), Math.ceil(py + radius * squash), Math.ceil(pz + radius)],
    (cx, cy, cz) => {
      const d = Math.hypot((cx - px) / radius, (cy - py) / (radius * squash), (cz - pz) / radius);

      return d + hash(cx, cy, cz, 41) * 0.35 < 1.05 ? pick(cx, cy, cz) : undefined;
    }
  );
}

function blossom(
  x: number,
  y: number,
  z: number
): Block {
  return hash(x, y, z, 42) < 0.62 ? B.blossom : B.paleBlossom;
}

/**
 * Sakura: a dark, slightly leaning trunk forking into three or four limbs
 * that reach up and out, each under a cloud of pink and pale blossom.
 * `[x, y, z]` is the first air cell above the ground.
 */
export function cherry(
  b: Brush,
  [x, y, z]: Vec3,
  size = 5
): void {
  const lean = hash(x, 0, z, 43) * Math.PI * 2;
  const fork: Vec3 = [x + Math.cos(lean) * 1.2, y + size * 0.55, z + Math.sin(lean) * 1.2];
  const limbs = 3 + (hash(x, 1, z, 44) > 0.5 ? 1 : 0);
  const tips = Array.from({ length: limbs }, (_, index): Vec3 => {
    const angle = lean + (index / limbs) * Math.PI * 2 + hash(x, index, z, 45) * 0.8;
    const reach = size * (0.8 + hash(x, index, z, 46) * 0.5);

    return [fork[0] + Math.cos(angle) * reach, y + size * (1.1 + hash(x, index, z, 47) * 0.4), fork[2] + Math.sin(angle) * reach];
  });

  for (const tip of tips) {
    cluster(b, [tip[0], tip[1] + 1, tip[2]], size * 0.75, 0.6, blossom);
  }
  cluster(b, [fork[0], y + size * 1.6, fork[2]], size * 0.8, 0.55, blossom);
  limb(b, [x, y - 1, z], fork, size >= 5 ? 1 : 0.5, B.cherryBark);
  for (const tip of tips) {
    limb(b, fork, tip, 0.5, B.cherryBark);
  }
}

/**
 * Fallen petals on the lawn under a cherry, thinning out towards the edge of
 * its canopy. Only the valley floor takes them.
 */
export function petals(
  b: Brush,
  [x, z]: readonly [x: number, z: number],
  radius: number
): void {
  b.fill([x - radius, FLOOR - 1, z - radius], [x + radius, FLOOR - 1, z + radius], (px, py, pz) => {
    const distance = Math.hypot(px - x, pz - z) / radius;
    const lawn = groundAt(px, pz) === FLOOR;

    return lawn && distance < 1 && hash(px, py, pz, 58) > distance * 0.9 ? B.petals : undefined;
  });
}

/**
 * Japanese black pine: a twisting trunk leaning out, with flat pads of
 * needles on short branches, the top pad the widest.
 */
export function pine(
  b: Brush,
  [x, y, z]: Vec3,
  height = 9
): void {
  const lean = hash(x, 2, z, 48) * Math.PI * 2;
  const bend = 0.18 + hash(x, 3, z, 49) * 0.2;
  function trunkAt(t: number): Vec3 {
    const drift = Math.sin(t * Math.PI * 0.8) * height * bend;

    return [x + Math.cos(lean) * drift, y + t * height, z + Math.sin(lean) * drift];
  }

  const pads = 3 + Math.floor(hash(x, 4, z, 50) * 2);
  for (let pad = 0; pad < pads; pad++) {
    const t = 0.45 + (pad / pads) * 0.55;
    const [tx, ty, tz] = trunkAt(t);
    const angle = lean + pad * 2.3 + hash(x, pad, z, 51);
    const reach = pad === pads - 1 ? 0 : 1.5 + (1 - t) * height * 0.35;
    const end: Vec3 = [tx + Math.cos(angle) * reach, ty, tz + Math.sin(angle) * reach];
    const radius = pad === pads - 1 ? 3.2 : 2 + (1 - t) * 2.5;
    cluster(b, [end[0], end[1] + 0.6, end[2]], radius, 0.35, () => B.pine);
    if (reach > 0) {
      limb(b, [tx, ty, tz], end, 0.5, B.pineBark);
    }
  }
  for (let step = 0; step <= height * 2; step++) {
    stamp(b, trunkAt(step / (height * 2)), step < 2 ? 1 : 0.5, B.pineBark);
  }
}

/**
 * Japanese maple: a short trunk under a wide, low dome of red leaves.
 */
export function maple(
  b: Brush,
  [x, y, z]: Vec3,
  size = 4
): void {
  const crown = y + size + 1;
  cluster(b, [x, crown, z], size + 0.8, 0.55, () => B.maple);
  limb(b, [x, y - 1, z], [x, crown, z], 0.5, B.cherryBark);
}

/**
 * A clump of bamboo culms of uneven heights, leaves in tufts near the tops.
 */
export function bamboo(
  b: Brush,
  [x, y, z]: Vec3,
  height = 14
): void {
  for (let culm = 0; culm < 5; culm++) {
    const cx = x + Math.round((hash(x, culm, z, 52) - 0.5) * 4);
    const cz = z + Math.round((hash(x, culm, z, 53) - 0.5) * 4);
    const top = y + Math.round(height * (0.7 + hash(x, culm, z, 54) * 0.3));
    b.box([cx, y, cz], [cx, top, cz], B.bamboo.poleY);
    for (let tuft = 0; tuft < 3; tuft++) {
      const ty = top - 1 - tuft * 2;
      const dx = Math.round((hash(cx, ty, cz, 55) - 0.5) * 3);
      const dz = Math.round((hash(cx, ty, cz, 56) - 0.5) * 3);
      if (dx !== 0 || dz !== 0) {
        b.put([cx + dx, ty, cz + dz], B.bambooLeaves);
      }
    }
    b.put([cx, top + 1, cz], B.bambooLeaves);
  }
}

/**
 * A low clipped azalea mound.
 */
export function azalea(
  b: Brush,
  [x, y, z]: Vec3,
  radius = 2
): void {
  cluster(b, [x, y, z], radius + 0.4, 0.5, (cx, cy, cz) => {
    if (cy < y) {
      return undefined;
    }

    return hash(cx, cy, cz, 57) < 0.25 ? B.leaves : B.azalea;
  });
}
