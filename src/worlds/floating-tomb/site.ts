// Import Internal Dependencies
import type { Bounds } from "../../core/world.ts";

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

export const COPY_SPACING = { x: 400, z: 190 };

/**
 * Bounds of one copy of the scene, spires and summit included.
 */
export const EXTENT: Bounds = { min: [-50, -40, -85], max: [345, 82, 85] };
