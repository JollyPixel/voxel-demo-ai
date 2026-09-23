// Import Internal Dependencies
import type { Brush, Vec3 } from "../builder/Brush.ts";
import { copyOffsets, SITE } from "../site.ts";
import { createRandom, type Random } from "../utils/random.ts";
import { buildPath } from "./path.ts";
import { buildPlatform } from "./platform.ts";
import { buildPyramid } from "./pyramid.ts";

export { buildTestPad } from "./testPad.ts";

export interface Zone {
  name: string;
  /**
   * World position of the zone's local origin.
   */
  origin: Vec3;
  build: (b: Brush, random: Random) => void;
}

/**
 * The scene, in build order; each zone raises its own island. Zones share one
 * random stream, so reordering them reshuffles every seeded detail.
 */
export const ZONES: readonly Zone[] = [
  { name: "Platform", origin: SITE.platform.origin, build: buildPlatform },
  { name: "Path", origin: SITE.path.origin, build: buildPath },
  { name: "Pyramid", origin: SITE.pyramid.origin, build: buildPyramid }
];

/**
 * Milliseconds spent writing voxels, by zone name.
 */
export type ZoneTimings = Record<string, number>;

/**
 * Builds `copies` copies of the scene from `seed`.
 */
export function buildZones(
  brush: Brush,
  options: { seed: number; copies: number; }
): ZoneTimings {
  const random = createRandom(options.seed);
  const timings: ZoneTimings = Object.fromEntries(ZONES.map(({ name }) => [name, 0]));

  for (const offset of copyOffsets(options.copies)) {
    const copy = brush.translated(offset);
    for (const zone of ZONES) {
      const start = performance.now();
      zone.build(copy.translated(zone.origin), random);
      timings[zone.name] += performance.now() - start;
    }
  }

  return timings;
}
