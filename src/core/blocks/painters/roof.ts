// Import Internal Dependencies
import type { Palette, TilePainter } from "./tile.ts";

// CONSTANTS
/**
 * Shading across one four-pixel run of tiles: the lit crown of a round
 * cover tile, its shoulder, then the shaded pan tile between two covers.
 */
const kProfile = [3.3, 2.6, 1.7, 0.6];

/**
 * Kawara roof tiles, drawn at 16×16: rows of round cover tiles over pan
 * tiles, each course lipped by a bright edge and shadowed where it overlaps
 * the course below.
 */
export function roofTiles(
  palette: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const course = v % 8;
    let level = kProfile[u % 4];
    if (course === 7) {
      level -= 1;
    }
    else if (course === 0) {
      level += 0.6;
    }
    tile.set(u, v, palette.mix(level + (tile.noise(u, v, 1) - 0.5) * 0.5));
  });
}
