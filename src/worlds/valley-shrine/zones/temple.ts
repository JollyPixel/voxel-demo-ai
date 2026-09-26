// Import Internal Dependencies
import type { Brush } from "../../../core/builder/Brush.ts";
import { rising } from "../../../core/builder/orientation.ts";
import type { Random } from "../../../core/utils/random.ts";
import { B } from "../blocks.ts";
import {
  columns,
  hangingLantern,
  lying,
  railing,
  stoneLantern,
  walls
} from "../prefabs/architecture.ts";
import { roof } from "../prefabs/roof.ts";
import { cherry } from "../prefabs/trees.ts";
import { FLOOR, SITE } from "../site.ts";

// CONSTANTS
const { compound, hall } = SITE;
const kCx = compound.x;
const kCz = compound.z;
/**
 * First air cell on the cloister floor, one step above the courtyard.
 */
const kWalk = FLOOR + 1;
const kCorridorHeight = 7;
const kGate = { z: kCz + compound.halfZ - 2, halfX: 8, halfZ: 4 };

/**
 * The temple compound, after inspiration 2: a cloister of vermilion posts
 * and lattice under copper roofs, broken on the south by a two-storey gate,
 * around a gravel court with the main hall at the back. The bell pavilion
 * stands outside to the west.
 */
export function buildTemple(
  b: Brush,
  _random: Random
): void {
  buildCourt(b);
  buildCloister(b);
  buildGate(b);
  buildHall(b);
  buildBellPavilion(b);
}

function buildCourt(
  b: Brush
): void {
  const inner = [compound.halfX - compound.corridor + 1, compound.halfZ - compound.corridor + 1];
  b.box([kCx - inner[0], FLOOR - 1, kCz - inner[1]], [kCx + inner[0], FLOOR - 1, kCz + inner[1]], B.gravel);
  // The paved way from the gate to the hall stair.
  b.box([kCx - 3, FLOOR - 1, hall.z + 16], [kCx + 3, FLOOR - 1, kGate.z], B.paving);
  for (const side of [-1, 1]) {
    stoneLantern(b, [kCx + side * 9, FLOOR, kCz + 18]);
    stoneLantern(b, [kCx + side * 9, FLOOR, kCz + 8]);
    cherry(b, [kCx + side * 22, FLOOR, kCz + 17], 5);
  }
}

/**
 * The covered walk around the court: stone floor, a lattice outer wall, an
 * open inner colonnade, gabled copper roofs, and a hipped pavilion roof
 * over each corner.
 */
function buildCloister(
  b: Brush
): void {
  const { halfX, halfZ, corridor } = compound;
  const [ix, iz] = [halfX - corridor + 1, halfZ - corridor + 1];
  const top = kWalk + kCorridorHeight - 1;
  function inGate(dx: number, dz: number): boolean {
    return dz > 0 && Math.abs(dx) <= kGate.halfX;
  }

  b.fill([kCx - halfX, FLOOR, kCz - halfZ], [kCx + halfX, FLOOR, kCz + halfZ], (x, _y, z) => (
    Math.abs(x - kCx) >= ix || Math.abs(z - kCz) >= iz ? B.stone : undefined
  ));

  walls(b, [kCx, kWalk, kCz], [halfX, halfZ], kCorridorHeight, {
    panel: (course) => (course === 1 || course >= kCorridorHeight - 2 ? B.plaster : undefined),
    open: (dx, dz) => inGate(dx, dz)
  });
  // Lattice rails through the open courses of the outer wall.
  for (const course of [2, 4]) {
    for (let dx = -halfX + 1; dx < halfX; dx++) {
      for (const sz of [-1, 1]) {
        if (dx % 4 !== 0 && !inGate(dx, sz)) {
          b.put([kCx + dx, kWalk + course, kCz + sz * halfZ], B.vermilion.pole, lying("x"));
        }
      }
    }
    for (let dz = -halfZ + 1; dz < halfZ; dz++) {
      if (dz % 4 !== 0) {
        for (const sx of [-1, 1]) {
          b.put([kCx + sx * halfX, kWalk + course, kCz + dz], B.vermilion.pole, lying("z"));
        }
      }
    }
  }

  // Inner colonnade: posts under a beam, a low rail between them.
  b.fill([kCx - ix, kWalk, kCz - iz], [kCx + ix, top, kCz + iz], (x, y, z) => {
    const dx = x - kCx;
    const dz = z - kCz;
    if ((Math.abs(dx) !== ix && Math.abs(dz) !== iz) || inGate(dx, dz)) {
      return undefined;
    }
    const alongWall = Math.abs(dx) === ix ? dz : dx;
    if ((Math.abs(dx) === ix && Math.abs(dz) === iz) || alongWall % 4 === 0) {
      return B.vermilion;
    }

    return y === top ? B.vermilion : undefined;
  });

  const eave = top + 2;
  const across = (corridor - 1) / 2;
  const runs = [
    { x: kCx, z: kCz - halfZ + across, hx: halfX, hz: across + 2 },
    { x: kCx - halfX + across, z: kCz, hx: across + 2, hz: halfZ },
    { x: kCx + halfX - across, z: kCz, hx: across + 2, hz: halfZ },
    { x: kCx - (halfX + kGate.halfX) / 2, z: kCz + halfZ - across, hx: (halfX - kGate.halfX) / 2, hz: across + 2 },
    { x: kCx + (halfX + kGate.halfX) / 2, z: kCz + halfZ - across, hx: (halfX - kGate.halfX) / 2, hz: across + 2 }
  ];
  for (const run of runs) {
    const wall = run.hx > run.hz ? [run.hx, across] as const : [across, run.hz] as const;
    roof(b, [Math.round(run.x), eave, Math.round(run.z)], Math.floor(run.hx), run.hz, {
      tile: B.copperRoof,
      eave: 1,
      gable: 0,
      wall,
      upturn: false,
      ornaments: false
    });
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const corner = [kCx + sx * (halfX - across), kCz + sz * (halfZ - across)] as const;
    roof(b, [corner[0], eave, corner[1]], across + 3, across + 3, { tile: B.copperRoof, eave: 2 });
  }
}

/**
 * Rōmon: a two-storey gate over the south walk. Vermilion posts and a
 * plastered end bay on either side of the passage, a skirt roof, then an
 * upper storey of shoji under a hip-and-gable roof.
 */
function buildGate(
  b: Brush
): void {
  const { halfX, halfZ, z } = kGate;
  const ground = 8;

  b.box([kCx - halfX, FLOOR, z - halfZ], [kCx + halfX, FLOOR, z + halfZ], B.stone);
  walls(b, [kCx, kWalk, z], [halfX, halfZ], ground, {
    panel: () => B.plaster,
    open: (dx, dz) => Math.abs(dx) < halfX && (Math.abs(dz) === halfZ || Math.abs(dx) <= 4)
  });
  columns(b, [-4, 4].flatMap((dx) => [[kCx + dx, z - halfZ], [kCx + dx, z + halfZ], [kCx + dx, z]] as const), kWalk, ground);
  b.box([kCx - halfX, kWalk + ground - 1, z - halfZ], [kCx + halfX, kWalk + ground - 1, z + halfZ], B.vermilion);
  b.put([kCx, kWalk + ground - 2, z + halfZ], B.gold);
  for (const dx of [-2, 2]) {
    hangingLantern(b, [kCx + dx, kWalk + ground - 2, z + halfZ]);
  }

  const skirt = kWalk + ground + 1;
  const upper = roof(b, [kCx, skirt, z], halfX + 3, halfZ + 3, { wall: [halfX, halfZ], until: [halfX - 1, halfZ - 1] });
  walls(b, [kCx, upper + 1, z], [halfX - 1, halfZ - 1], 6, {
    panel: (course) => (course === 4 ? B.plaster : B.shoji)
  });
  roof(b, [kCx, upper + 8, z], halfX + 4, halfZ + 4, { wall: [halfX - 1, halfZ - 1], gable: 3 });
}

/**
 * Hondō: a hall on a stone base with a cedar veranda and rails, a front
 * stair, an outer colonnade hung with lanterns around shoji walls, a skirt
 * roof, an upper storey, and a great hip-and-gable roof with gold horns.
 */
function buildHall(
  b: Brush
): void {
  const { x, z } = hall;
  const base = { hx: 22, hz: 15 };
  const deck = FLOOR + 2;
  const floor = deck + 1;

  b.box([x - base.hx, FLOOR, z - base.hz], [x + base.hx, deck - 1, z + base.hz], B.stone);
  b.box([x - base.hx, deck, z - base.hz], [x + base.hx, deck, z + base.hz], B.cedar);
  for (let step = 0; step < 3; step++) {
    const sz = z + base.hz + 3 - step;
    b.box([x - 6, FLOOR, sz], [x + 6, FLOOR + step - 1, sz], B.stone);
    for (let dx = -6; dx <= 6; dx++) {
      b.put([x + dx, FLOOR + step, sz], B.stone.stair, rising("N"));
    }
  }
  for (const [from, to] of [
    [[x - base.hx, floor, z + base.hz], [x - 7, floor, z + base.hz]],
    [[x + 7, floor, z + base.hz], [x + base.hx, floor, z + base.hz]],
    [[x - base.hx, floor, z - base.hz], [x + base.hx, floor, z - base.hz]],
    [[x - base.hx, floor, z - base.hz], [x - base.hx, floor, z + base.hz]],
    [[x + base.hx, floor, z - base.hz], [x + base.hx, floor, z + base.hz]]
  ] as const) {
    railing(b, from, to, B.vermilion, { every: 4 });
  }

  // Outer colonnade and its beam, lanterns hung between the columns.
  const outer = { hx: 20, hz: 12 };
  const colonnade: [number, number][] = [];
  for (let dx = -outer.hx; dx <= outer.hx; dx += 4) {
    colonnade.push([x + dx, z - outer.hz], [x + dx, z + outer.hz]);
  }
  for (let dz = -outer.hz + 4; dz < outer.hz; dz += 4) {
    colonnade.push([x - outer.hx, z + dz], [x + outer.hx, z + dz]);
  }
  columns(b, colonnade, floor, 8);
  b.fill([x - outer.hx, floor + 8, z - outer.hz], [x + outer.hx, floor + 8, z + outer.hz], (px, _py, pz) => (
    Math.abs(px - x) === outer.hx || Math.abs(pz - z) === outer.hz ? B.vermilion : undefined
  ));
  for (let dx = -outer.hx + 2; dx < outer.hx; dx += 4) {
    hangingLantern(b, [x + dx, floor + 7, z + outer.hz]);
  }

  walls(b, [x, floor, z], [16, 8], 9);

  const skirt = floor + 10;
  const upper = roof(b, [x, skirt, z], outer.hx + 4, outer.hz + 4, { wall: [outer.hx, outer.hz], until: [15, 7] });
  walls(b, [x, upper + 1, z], [15, 7], 6, {
    panel: (course) => (course === 1 || course >= 4 ? B.plaster : B.shoji)
  });
  roof(b, [x, upper + 8, z], 23, 15, { wall: [15, 7], gable: 4 });
}

/**
 * Shōrō: four posts on a stone plinth under a hipped roof, a bronze bell
 * hanging from a cross beam.
 */
function buildBellPavilion(
  b: Brush
): void {
  const { x, z } = SITE.bell;
  const height = 8;

  b.box([x - 5, FLOOR, z - 5], [x + 5, FLOOR, z + 5], B.stone);
  columns(b, [[x - 3, z - 3], [x + 3, z - 3], [x - 3, z + 3], [x + 3, z + 3]], kWalk, height);
  const beam = kWalk + height;
  b.fill([x - 3, beam, z - 3], [x + 3, beam, z + 3], (px, _py, pz) => (
    Math.abs(px - x) === 3 || Math.abs(pz - z) === 3 || pz === z ? B.vermilion : undefined
  ));
  b.put([x, beam - 1, z], B.darkWood.poleY);
  b.box([x, beam - 2, z], [x, beam - 2, z], B.gold);
  b.fill([x - 1, beam - 5, z - 1], [x + 1, beam - 3, z + 1], (px, py, pz) => (
    Math.abs(px - x) + Math.abs(pz - z) <= (py === beam - 3 ? 1 : 2) ? B.gold : undefined
  ));
  roof(b, [x, beam + 2, z], 6, 6, { wall: [3, 3] });
}
