// Import Internal Dependencies
import { B } from "./blocks.ts";
import type { Brush } from "../../core/builder/Brush.ts";

// CONSTANTS
const kShapes = [
  B.sandstone, B.sandstone.slabBottom, B.sandstone.slabTop, B.sandstone.pole, B.sandstone.poleY,
  B.sandstone.ramp, B.sandstone.rampCornerInner, B.sandstone.rampCornerOuter,
  B.sandstone.stair, B.sandstone.stairCornerInner, B.sandstone.stairCornerOuter
];
const kFlips = [
  {},
  { flipX: true },
  { flipY: true },
  { flipX: true, flipY: true, flipZ: true }
];

/**
 * One row per shape, showing each of its four rotations under four flip
 * combinations. Gold marks the origin corner and lapis the +x side.
 */
export function buildTestPad(
  b: Brush
): void {
  b.box([-2, 18, -2], [49, 19, 39], B.granite);
  b.box([-2, 20, -2], [49, 20, 39], B.limestone);

  for (const [row, shape] of kShapes.entries()) {
    for (let rotation = 0; rotation < 4; rotation++) {
      for (const [column, flips] of kFlips.entries()) {
        const x = rotation * 12 + column * 3;
        const z = row * 3;
        b.put([x, 21, z], B.gold);
        b.put([x + 1, 21, z], B.lapis);
        b.put([x, 22, z], shape, { rotation, ...flips });
      }
    }
  }
}
