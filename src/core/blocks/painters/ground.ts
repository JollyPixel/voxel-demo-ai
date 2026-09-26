// Import Internal Dependencies
import {
  TRANSPARENT,
  shade,
  type Palette,
  type TileCanvas,
  type TilePainter
} from "./tile.ts";

// CONSTANTS
const kBladeCount = 260;

/**
 * Lawn seen from above, after inspiration v1: a tangle of overlapping blade
 * strokes, shaded ones and sunlit ones, over a quiet base. The base keeps
 * its large-scale tone low so alternate tiles meet without visible seams.
 */
export function grassTop(
  palette: Palette
): TilePainter {
  return (tile) => {
    tile.each((u, v) => {
      const fine = tile.smoothNoise(u, v, 8, 2) - 0.5;
      tile.set(u, v, palette.mix(2.6 + fine * 0.7));
    });
    for (let blade = 0; blade < kBladeCount; blade++) {
      const lit = tile.noise(blade, 4, 8) > 0.55;
      const tone = lit ? 3.4 + tile.noise(blade, 5, 9) * 1.2 : 1.1 + tile.noise(blade, 5, 9) * 0.9;
      stroke(tile, palette, blade, tone, 2 + Math.floor(tile.noise(blade, 2, 6) * 4));
    }
  };
}

/**
 * One blade drawn upwards from a random root, leaning sideways over its
 * upper half and lightening towards its tip.
 */
function stroke(
  tile: TileCanvas,
  palette: Palette,
  blade: number,
  tone: number,
  length: number
): void {
  const root = {
    u: Math.floor(tile.noise(blade, 0, 4) * tile.size),
    v: Math.floor(tile.noise(blade, 1, 5) * tile.size)
  };
  const lean = tile.noise(blade, 3, 7) > 0.5 ? 1 : -1;

  for (let step = 0; step < length; step++) {
    const u = root.u + (step >= Math.ceil(length / 2) ? lean : 0);
    tile.set(u, root.v - step, palette.mix(tone + (step / length) * 0.7));
  }
}

/**
 * Earth under a grass cap whose lower edge hangs in pointed blades of
 * uneven length, with a soft shadow cast on the soil beneath.
 */
export function grassSide(
  grass: Palette,
  soil: Palette
): TilePainter {
  const earth = granular(soil);

  return (tile) => {
    earth(tile);
    for (let u = 0; u < tile.size; u++) {
      const depth = fringeDepth(tile, u);
      for (let v = 0; v < depth; v++) {
        const level = 3 - (v / depth) * 1.6 + (tile.smoothNoise(u, v, 8, 9) - 0.5) * 0.8;
        tile.set(u, v, grass.mix(v === depth - 1 ? level - 0.7 : level));
      }
      tile.set(u, depth, shade(tile.get(u, depth), 0.68));
      tile.set(u, depth + 1, shade(tile.get(u, depth + 1), 0.84));
    }
  };
}

/**
 * Cap depth of one pixel column: a slowly wandering base plus a sawtooth
 * of blade points, some longer than others.
 */
function fringeDepth(
  tile: TileCanvas,
  u: number
): number {
  const base = 7 + Math.round(tile.smoothNoise(u, 0, 16, 3) * 3);
  const group = Math.floor(u / 4);
  const phase = tile.wrap(u) % 4;
  const reach = 1 + tile.noise(group, 0, 8) * 4;
  const point = [0.35, 1, 0.55, 0][phase];

  return base + Math.round(point * reach);
}

/**
 * Earth or sand: a soft mottle with a light grain and a few pebbles.
 */
export function granular(
  palette: Palette
): TilePainter {
  const middle = (palette.size - 1) / 2;

  return (tile) => {
    tile.each((u, v) => {
      const mottle = tile.smoothNoise(u, v, 8, 5) - 0.5;
      const detail = tile.smoothNoise(u, v, 4, 6) - 0.5;
      tile.set(u, v, palette.mix(middle + mottle * 1.6 + detail * 0.7 + (tile.noise(u, v, 7) - 0.5) * 0.35));
    });
    for (let pebble = 0; pebble < 7; pebble++) {
      const u = Math.floor(tile.noise(pebble, 0, 8) * tile.size);
      const v = Math.floor(tile.noise(pebble, 1, 9) * tile.size);
      tile.set(u, v, palette.mix(palette.size - 1.5));
      tile.set(u + 1, v, palette.mix(palette.size - 2));
      tile.set(u, v + 1, palette.mix(1));
      tile.set(u + 1, v + 1, palette.mix(0.5));
    }
  };
}

/**
 * Wind ripples across sand: soft bands, bent by a slow wobble, that climb
 * one full wave across the tile so the pattern wraps.
 */
export function rippledSand(
  palette: Palette
): TilePainter {
  const middle = (palette.size - 1) / 2;
  const wavelength = 8;

  return (tile) => tile.each((u, v) => {
    const bend = tile.smoothNoise(u, v, 16, 10) * wavelength;
    const phase = (v + u * wavelength / tile.size + bend) / wavelength * Math.PI * 2;
    // Sharpened sine: broad lit crests, narrow shaded troughs.
    const ripple = Math.sign(Math.sin(phase)) * Math.abs(Math.sin(phase)) ** 0.6;
    tile.set(u, v, palette.mix(middle + ripple * 0.9 + (tile.noise(u, v, 11) - 0.5) * 0.35));
  });
}

/**
 * Bark in wavering vertical grooves.
 */
export function bark(
  palette: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const wobble = Math.round((tile.smoothNoise(0, v, 8, 12) - 0.5) * 3);
    const groove = tile.wrap(u + wobble) % 6;
    const level = groove === 0 ? 0.4 : 2 - Math.abs(groove - 3) * 0.3;
    tile.set(u, v, palette.mix(level + (tile.noise(u, v, 13) - 0.5) * 0.6));
  });
}

/**
 * Foliage rendered with an alpha mask: shaded clumps with a few small gaps
 * between them, covered in leaves lit on their upper left.
 */
export function foliage(
  palette: Palette
): TilePainter {
  return (tile) => {
    tile.each((u, v) => {
      const cluster = tile.smoothNoise(u, v, 8, 14);
      if (tile.smoothNoise(u, v, 4, 15) < 0.16 && cluster < 0.5) {
        tile.set(u, v, TRANSPARENT);

        return;
      }
      tile.set(u, v, palette.mix(0.7 + cluster * 1.4 + (tile.noise(u, v, 16) - 0.5) * 0.2));
    });
    for (let leaf = 0; leaf < 30; leaf++) {
      const u = Math.floor(tile.noise(leaf, 0, 17) * tile.size);
      const v = Math.floor(tile.noise(leaf, 1, 18) * tile.size);
      const tone = 2.6 + tile.noise(leaf, 2, 19) * 1.6;
      tile.set(u, v - 1, palette.mix(tone + 0.5));
      tile.set(u - 1, v, palette.mix(tone + 0.3));
      tile.set(u, v, palette.mix(tone));
      tile.set(u + 1, v, palette.mix(tone - 0.5));
      tile.set(u, v + 1, palette.mix(tone - 0.9));
    }
  };
}

/**
 * `base` scattered with small flowers: a bright centre with four petals,
 * each flower in one of the `petals` palettes.
 */
export function flowers(
  base: TilePainter,
  petals: readonly Palette[],
  count = 14
): TilePainter {
  return (tile) => {
    base(tile);
    for (let flower = 0; flower < count; flower++) {
      const u = Math.floor(tile.noise(flower, 0, 30) * tile.size);
      const v = Math.floor(tile.noise(flower, 1, 31) * tile.size);
      const palette = petals[Math.floor(tile.noise(flower, 2, 32) * petals.length)];
      const top = palette.size - 1;
      tile.set(u, v - 1, palette.at(top - 1));
      tile.set(u - 1, v, palette.at(top - 1));
      tile.set(u + 1, v, palette.at(top - 2));
      tile.set(u, v + 1, palette.at(top - 2));
      tile.set(u, v, palette.at(top));
    }
  };
}
