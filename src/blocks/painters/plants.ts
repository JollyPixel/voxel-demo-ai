// Import Internal Dependencies
import {
  Palette,
  TILE_SIZE,
  parseHex,
  type TileCanvas,
  type TilePainter
} from "./tile.ts";

// CONSTANTS
const kStem = new Palette("#2c5a22", "#3b7a2c", "#4f9838");
const kPollen = parseHex("#fcd660");

/**
 * Vertical stroke from the bottom edge up to `top`, drawn one row at a time.
 */
function stem(
  tile: TileCanvas,
  u: number,
  top: number,
  palette = kStem
): void {
  for (let v = TILE_SIZE - 1; v >= top; v--) {
    tile.set(u, v, palette.at(v < top + 2 ? 2 : 1));
  }
}

/**
 * Three flowers of varying height, each a small shaded blossom on a stem.
 */
export function flowers(
  petals: Palette
): TilePainter {
  return (tile) => {
    for (const [u, top] of [[3, 7], [8, 3], [12, 8]]) {
      stem(tile, u, top + 2);
      tile.set(u - 1, top + 6, kStem.at(2));
      for (const [du, dv] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const diagonal = du !== 0 && dv !== 0;
        tile.set(u + du, top + 1 + dv, petals.at(diagonal ? 1 : 2 + tile.noise(u, top, du + dv)));
      }
      tile.set(u, top + 1, kPollen);
    }
  };
}

/**
 * Papyrus: tall stems crowned with fanned umbels.
 */
export function papyrus(): TilePainter {
  const umbel = new Palette("#6f9a3c", "#8fb84e", "#b5d46a");

  return (tile) => {
    for (const [u, top] of [[3, 4], [8, 1], [12, 5]]) {
      stem(tile, u, top + 2);
      for (let du = -2; du <= 2; du++) {
        tile.set(u + du, top + (Math.abs(du) === 2 ? 1 : 0), umbel.at(1 + tile.noise(u, du, 1)));
        tile.set(u + du, top + 1, umbel.at(Math.abs(du) === 2 ? 0 : 2));
      }
    }
  };
}

/**
 * A palm frond: an arching midrib with leaflets hanging from both sides.
 */
export function frond(): TilePainter {
  const leaf = new Palette("#2d6a2a", "#3f8834", "#56a340", "#72bd50");

  return (tile) => {
    for (let u = 0; u < TILE_SIZE; u++) {
      const rib = 4 + Math.round(((u - 7.5) / 7.5) ** 2 * 5);
      tile.set(u, rib, leaf.at(0));
      const length = 3 + Math.floor(tile.noise(u, 0, 2) * 4) - Math.abs(u - 7) / 4;
      for (let dv = 1; dv <= length; dv++) {
        tile.set(u, rib + dv, leaf.at(dv === 1 ? 3 : 1 + tile.noise(u, dv, 3) * 2));
      }
    }
  };
}

/**
 * A clump of grass blades of mixed height, leaning slightly.
 */
export function tuft(
  palette: Palette
): TilePainter {
  return (tile) => {
    for (let blade = 0; blade < 9; blade++) {
      const base = 1 + Math.floor(tile.noise(blade, 0, 4) * 14);
      const height = 5 + Math.floor(tile.noise(blade, 1, 5) * 9);
      const lean = tile.noise(blade, 2, 6) > 0.5 ? 1 : -1;
      for (let step = 0; step < height; step++) {
        const u = base + (step > height / 2 ? lean : 0);
        tile.set(u, TILE_SIZE - 1 - step, palette.at(step > height - 3 ? 3 : 1 + tile.noise(blade, step, 7)));
      }
    }
  };
}

/**
 * Roots and vines hanging from the top edge, for island undersides.
 */
export function hangingRoots(): TilePainter {
  const root = new Palette("#3a2a1c", "#54402a", "#6b5236");
  const leaf = new Palette("#2f5e27", "#43803a", "#5b9c47");

  return (tile) => {
    for (let strand = 0; strand < 5; strand++) {
      let u = 1 + Math.floor(tile.noise(strand, 0, 8) * 14);
      const length = 6 + Math.floor(tile.noise(strand, 1, 9) * 10);
      for (let v = 0; v < length; v++) {
        if (tile.noise(strand, v, 10) > 0.8) {
          u += tile.noise(strand, v, 11) > 0.5 ? 1 : -1;
        }
        tile.set(u, v, root.at(1 + tile.noise(u, v, 12)));
        if (tile.noise(u, v, 13) > 0.72) {
          tile.set(u + 1, v, leaf.at(1 + tile.noise(u, v, 14)));
        }
      }
    }
  };
}
