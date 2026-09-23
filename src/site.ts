// Import Internal Dependencies
import type { Vec3 } from "./builder/Brush.ts";

/**
 * Where each zone sits in the world. Zones build in local coordinates around
 * their origin, each on its own floating island.
 */
export const SITE = {
  platform: {
    origin: [0, 0, 0]
  },
  path: {
    /**
     * Local x = 0 is the rim of the platform; x = `length` is the foot of
     * the pyramid's plinth.
     */
    origin: [35, 0, 0],
    length: 170
  },
  pyramid: {
    /**
     * The plinth's west edge meets the end of the path.
     */
    origin: [258, 0, 0]
  }
} as const;

// CONSTANTS
const kCopySpacing = { x: 400, z: 190 };
/**
 * Bounds of one copy of the scene, spires and summit included.
 */
const kExtent = { min: [-50, -40, -85], max: [345, 82, 85] } as const;

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

/**
 * Bounds enclosing `count` copies of the scene.
 */
export function sceneBounds(
  count: number
): Bounds {
  const offsets = copyOffsets(count);
  const [maxX, , maxZ] = offsets[offsets.length - 1];

  return {
    min: kExtent.min,
    max: [kExtent.max[0] + maxX, kExtent.max[1], kExtent.max[2] + maxZ]
  };
}

/**
 * World offsets of `count` scene copies laid out on a square grid, used to
 * stress-test the renderer.
 */
export function copyOffsets(
  count: number
): Vec3[] {
  const columns = Math.ceil(Math.sqrt(count));

  return Array.from({ length: count }, (_, index) => [
    (index % columns) * kCopySpacing.x,
    0,
    Math.floor(index / columns) * kCopySpacing.z
  ]);
}
