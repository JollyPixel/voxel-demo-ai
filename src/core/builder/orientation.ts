// Import Third-party Dependencies
import type { VoxelTransformOptions } from "@jolly-pixel/voxel.renderer";

/**
 * Compass directions on the xz plane: +x is east and +z is south.
 */
export type Direction = "N" | "E" | "S" | "W";

export const DIRECTIONS: Readonly<Record<Direction, readonly [dx: number, dz: number]>> = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0]
};

/*
 * CONSTANTS
 * Stairs and ramps have their tall back on +z; each quarter turn is
 * counter-clockwise seen from above (see the engine's `rotation.ts`).
 */
const kRiseRotation: Record<Direction, number> = { S: 0, E: 1, N: 2, W: 3 };
// The high corner of an unturned ramp corner is at (-x, +z).
const kRampCornerRotation: Record<string, number> = { "-1,1": 0, "1,1": 1, "1,-1": 2, "-1,-1": 3 };

/**
 * Turns a stair or ramp so that it climbs toward `direction`: its low edge
 * faces the opposite way.
 */
export function rising(
  direction: Direction
): VoxelTransformOptions {
  return { rotation: kRiseRotation[direction] };
}

/**
 * The cardinal direction closest to the vector (dx, dz).
 */
export function directionOf(
  dx: number,
  dz: number
): Direction {
  if (Math.abs(dx) >= Math.abs(dz)) {
    return dx >= 0 ? "E" : "W";
  }

  return dz >= 0 ? "S" : "N";
}

/**
 * Turns a convex corner piece so its high corner points to the (sx, sz)
 * quadrant, e.g. (-1, -1) for the north-west. Stair corners are modelled one
 * quarter turn behind ramp corners.
 */
export function outerCorner(
  shape: "ramp" | "stair",
  sx: number,
  sz: number
): VoxelTransformOptions {
  const rampRotation = kRampCornerRotation[`${Math.sign(sx)},${Math.sign(sz)}`];

  return { rotation: shape === "ramp" ? rampRotation : (rampRotation + 1) % 4 };
}
