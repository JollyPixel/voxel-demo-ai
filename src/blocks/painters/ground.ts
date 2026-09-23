// Import Internal Dependencies
import {
  TRANSPARENT,
  type Palette,
  type TilePainter
} from "./tile.ts";

/**
 * Lawn seen from above: mottled tone with bright blade tips.
 */
export function grassTop(
  palette: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const mottle = tile.noise(u >> 2, v >> 2, 1) * 1.2;
    const blade = tile.noise(u, v, 2);
    let level = 1.5 + mottle + (blade - 0.5) * 1.2;
    if (blade > 0.9) {
      level = palette.size - 1;
    }
    tile.set(u, v, palette.at(level));
  });
}

/**
 * Soil face under a grass fringe that hangs a few pixels down, unevenly.
 */
export function grassSide(
  grass: Palette,
  soil: Palette
): TilePainter {
  const earth = granular(soil);

  return (tile) => {
    earth(tile);
    for (let u = 0; u < 16; u++) {
      const fringe = 2 + Math.floor(tile.noise(u, 0, 3) * 4);
      for (let v = 0; v < fringe; v++) {
        const tip = v === fringe - 1;
        tile.set(u, v, grass.at(tip ? 1 : 2 + tile.noise(u, v, 4) * 2));
      }
    }
  };
}

/**
 * Earth or sand: fine grain with a few pebbles.
 */
export function granular(
  palette: Palette
): TilePainter {
  const middle = (palette.size - 1) / 2;

  return (tile) => tile.each((u, v) => {
    const n = tile.noise(u, v, 5);
    let level = middle + (tile.noise(u >> 1, v >> 1, 6) - 0.5) * 1.5;
    if (n > 0.94) {
      level = palette.size - 1;
    }
    else if (n < 0.06) {
      level = 0;
    }
    tile.set(u, v, palette.at(level));
  });
}

/**
 * Wind ripples across sand.
 */
export function rippledSand(
  palette: Palette
): TilePainter {
  const grain = granular(palette);

  return (tile) => {
    grain(tile);
    tile.each((u, v) => {
      if ((v + Math.floor(u / 4)) % 5 === 0 && tile.noise(u, v, 7) > 0.25) {
        tile.set(u, v, palette.at(1));
      }
    });
  };
}

/**
 * Tilled soil: dark furrows between raised rows.
 */
export function tilledSoil(
  palette: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const furrow = v % 4 === 3;
    tile.set(u, v, palette.at((furrow ? 0 : 2) + (tile.noise(u, v, 8) - 0.5) * 1.2));
  });
}

/**
 * Bark in vertical grooves.
 */
export function bark(
  palette: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const groove = (u + Math.floor(tile.noise(0, v >> 2, 9) * 2)) % 4 === 0;
    tile.set(u, v, palette.at((groove ? 0 : 2) + (tile.noise(u, v, 10) - 0.5) * 1.5));
  });
}

/**
 * Palm trunk: stacked, overlapping leaf-base rings.
 */
export function palmBark(
  palette: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const ring = v % 4;
    const level = ring === 0 ? 0 : 4 - ring + (tile.noise(u, v, 11) - 0.5);
    tile.set(u, v, palette.at(level));
  });
}

/**
 * Foliage with see-through gaps, rendered with an alpha mask.
 */
export function foliage(
  palette: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const cluster = tile.noise(u >> 2, v >> 2, 12);
    if (tile.noise(u, v, 13) < 0.18 + (1 - cluster) * 0.12) {
      tile.set(u, v, TRANSPARENT);

      return;
    }
    const light = (v % 4 === 0 ? 1 : 0) + cluster * 2;
    tile.set(u, v, palette.at(0.5 + light + (tile.noise(u, v, 14) - 0.5)));
  });
}
