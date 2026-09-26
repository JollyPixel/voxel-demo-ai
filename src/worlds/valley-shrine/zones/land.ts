// Import Internal Dependencies
import type { Brush } from "../../../core/builder/Brush.ts";
import { SITE, WATER } from "../site.ts";
import { CASCADE_WATER, TERRAIN } from "../terrain.ts";

type Cell = readonly [x: number, z: number];

/**
 * The valley, the mountain ring and the water: one water table under the
 * whole valley floor, which shows wherever the stream and the pools carve
 * below it, the channel down the gorge, the notch on the east bluff, and
 * the two falls.
 */
export function buildLand(
  b: Brush
): void {
  TERRAIN.build(b);

  const { cascade, gorge } = SITE;
  waterRect(b, [-106, -100], [106, 59], WATER);
  waterRect(b, [-44, 60], [-29, 69], WATER);
  waterRect(b, [-38, 70], [-30, gorge.lip], WATER);
  waterRect(b, [cascade.x, cascade.z - 2], [cascade.x + 21, cascade.z + 2], CASCADE_WATER);

  b.waterfall([cascade.x - 0.05, (CASCADE_WATER + WATER) / 2, cascade.z + 0.5], 5, CASCADE_WATER - WATER);
  const drop = WATER + 46;
  b.waterfall([-33.5, WATER - drop / 2, gorge.lip + 1.05], 7, drop, "x");
}

/**
 * A water surface over the inclusive block of cells `from`..`to`.
 */
function waterRect(
  b: Brush,
  [x0, z0]: Cell,
  [x1, z1]: Cell,
  y: number
): void {
  b.pool([(x0 + x1 + 1) / 2, y, (z0 + z1 + 1) / 2], x1 - x0 + 1, z1 - z0 + 1);
}
