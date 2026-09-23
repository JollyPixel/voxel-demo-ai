// Import Internal Dependencies
import { hash } from "../../utils/noise.ts";
import {
  Palette,
  type TileCanvas,
  type TilePainter
} from "./tile.ts";

export interface MasonryOptions {
  /**
   * Course height in pixels; must divide the tile size.
   */
  course: number;
  /**
   * Block length in pixels; must divide the tile size.
   */
  length: number;
  /**
   * Horizontal shift of every other course.
   */
  stagger: number;
  /**
   * How far a block's base tone may stray from the middle of the palette.
   * @default 0.35
   */
  variation?: number;
}

/**
 * Dressed stone laid in courses, after the reference tileset: flat, pale
 * faces barely mottled, a lit rim on the top and left of each block, a
 * shaded rim on its bottom and right, and a soft joint.
 */
export function masonry(
  palette: Palette,
  options: MasonryOptions
): TilePainter {
  const { course, length, stagger, variation = 0.35 } = options;
  const middle = (palette.size - 1) / 2;

  return (tile) => tile.each((u, v) => {
    const row = Math.floor(v / course);
    const shifted = u + (row % 2) * stagger;
    const column = Math.floor(tile.wrap(shifted) / length);
    const x = tile.wrap(shifted) % length;
    const y = v % course;

    if (y === course - 1 || x === length - 1) {
      tile.set(u, v, palette.mix(0.5));

      return;
    }

    let level = middle + (hash(column, row, 7, tile.seed) - 0.5) * 2 * variation;
    if (y === 0 || x === 0) {
      level += 1.1;
    }
    else if (y === course - 2 || x === length - 2) {
      level -= 0.9;
    }
    level += (tile.smoothNoise(u, v, 8, 1) - 0.5) * 0.4 + (tile.noise(u, v, 2) - 0.5) * 0.15;
    tile.set(u, v, palette.mix(level));
  });
}

/**
 * Fluted column shaft, after the reference tileset: rounded vertical ribs
 * lit from the left, between plain bands at the top and bottom.
 */
export function fluted(
  palette: Palette,
  flute = 8
): TilePainter {
  const middle = (palette.size - 1) / 2;

  return (tile) => tile.each((u, v) => {
    const band = v < 2 || v >= tile.size - 2;
    const x = u % flute;
    let level = band ? middle + (v === 0 || v === tile.size - 2 ? 1 : -0.6) :
      middle + Math.cos(((x + 0.5) / flute) * Math.PI) * 1.2;
    if (!band && x === flute - 1) {
      level = 0.6;
    }
    level += (tile.smoothNoise(u, v, 8, 3) - 0.5) * 0.3;
    tile.set(u, v, palette.mix(level));
  });
}

/**
 * ±1 level on a few pixels, so flat faces read as grained stone.
 */
function speckle(
  tile: TileCanvas,
  u: number,
  v: number
): number {
  const n = tile.noise(u, v, 1);
  if (n < 0.12) {
    return -1;
  }

  return n > 0.9 ? 1 : 0;
}

/**
 * Irregular paving stones from a wrapped Voronoi diagram.
 */
export function flagstones(
  palette: Palette,
  stones = 6
): TilePainter {
  return (tile) => {
    const seeds = voronoiSeeds(tile, stones);

    tile.each((u, v) => {
      const { nearest, gap } = voronoi(tile, seeds, u, v);
      if (gap < 1.1) {
        tile.set(u, v, palette.at(0));

        return;
      }
      const tone = 1 + Math.floor(hash(nearest, 0, 3, tile.seed) * (palette.size - 2));
      const edge = gap < 2.2 ? -1 : 0;
      tile.set(u, v, palette.at(tone + edge + speckle(tile, u, v)));
    });
  };
}

/**
 * Weathered rock at full resolution: a soft mottle over wavering bedding,
 * split into slabs by dark cracks with shaded rims.
 */
export function rock(
  palette: Palette
): TilePainter {
  return (tile) => {
    const seeds = voronoiSeeds(tile, 6);

    tile.each((u, v) => {
      const { gap } = voronoi(tile, seeds, u, v);
      const bedding = Math.sin((v + tile.smoothNoise(u, v, 16, 5) * 6) / tile.size * Math.PI * 8) * 0.45;
      let level = 2 + bedding + (tile.smoothNoise(u, v, 8, 2) - 0.5) * 1.4 + (tile.noise(u, v, 3) - 0.5) * 0.4;
      if (gap < 1.2) {
        level -= 1.8;
      }
      else if (gap < 2.6) {
        level -= 0.5;
      }
      tile.set(u, v, palette.mix(level));
    });
  };
}

/**
 * Polished stone with light and dark flecks inside a bevelled frame.
 */
export function speckledStone(
  palette: Palette,
  fleck: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const n = tile.noise(u, v, 4);
    if (n > 0.975) {
      tile.set(u, v, fleck.at(fleck.size - 1));

      return;
    }
    if (n < 0.03) {
      tile.set(u, v, fleck.at(0));

      return;
    }
    tile.set(u, v, palette.at(2 + bevel(tile, u, v) + (tile.noise(u, v, 6) - 0.5)));
  });
}

/**
 * +1 on the tile's top and left edges, -1 on its bottom and right edges.
 */
function bevel(
  { size }: TileCanvas,
  u: number,
  v: number
): number {
  if (u === 0 || v === 0) {
    return 1;
  }

  return u === size - 1 || v === size - 1 ? -1 : 0;
}

/**
 * Smooth metal plate: bevelled rim, vertical gradient and a diagonal glint.
 */
export function metal(
  palette: Palette
): TilePainter {
  const top = palette.size - 1;

  return (tile) => tile.each((u, v) => {
    const glint = Math.abs(u + v - 12) < 1.5 ? 1 : 0;
    const gradient = 3 - v / 8;
    tile.set(u, v, palette.at(Math.min(top, gradient + glint + bevel(tile, u, v) * 1.5)));
  });
}

/**
 * Glazed tiles in a 2×2 grid, each with a bright glaze highlight.
 */
export function glazedTiles(
  palette: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const x = u % 8;
    const y = v % 8;
    if (x === 7 || y === 7) {
      tile.set(u, v, palette.at(0));

      return;
    }
    let level = 3 + (tile.noise(u, v, 8) - 0.5);
    if (x === 0 || y === 0) {
      level += 1;
    }
    else if (x === 6 || y === 6) {
      level -= 1;
    }
    if ((x === 1 || x === 2) && y === 1) {
      level = palette.size - 1;
    }
    tile.set(u, v, palette.at(level));
  });
}

/**
 * Deep stone scattered with metallic flecks, e.g. lapis lazuli with pyrite.
 */
export function inlaidStone(
  palette: Palette,
  fleck: Palette
): TilePainter {
  return (tile) => {
    speckledStone(palette, palette)(tile);
    tile.each((u, v) => {
      if (tile.noise(u, v, 9) > 0.93) {
        tile.set(u, v, fleck.at(fleck.size - 2 + tile.noise(u, v, 10)));
      }
    });
  };
}

/**
 * A dark frieze with lit upper and lower fillets and a zigzag between them.
 */
export function frieze(
  palette: Palette,
  accent: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    const zigzag = 6 + Math.abs((u % 6) - 3);
    if (v === 1 || v === 14) {
      tile.set(u, v, accent.at(1));
    }
    else if (v === 0 || v === 15) {
      tile.set(u, v, palette.at(0));
    }
    else if (v === zigzag || v === zigzag + 1) {
      tile.set(u, v, accent.at(v === zigzag ? 1 : 0));
    }
    else {
      tile.set(u, v, palette.at(1.5 + speckle(tile, u, v) + (tile.noise(u, v, 2) - 0.5)));
    }
  });
}

// An ankh, carved into the block face.
const kAnkh = [
  "..###..",
  ".#...#.",
  ".#...#.",
  "..#.#..",
  "#######",
  "...#...",
  "...#...",
  "...#...",
  "...#..."
];

/**
 * Relief motif on a smooth block: the motif is recessed, with its lower
 * right rim catching the light.
 */
export function carved(
  palette: Palette
): TilePainter {
  return (tile) => {
    const left = Math.floor((tile.size - kAnkh[0].length) / 2);
    const top = Math.floor((tile.size - kAnkh.length) / 2);
    function inMotif(u: number, v: number): boolean {
      return kAnkh[v - top]?.[u - left] === "#";
    }

    tile.each((u, v) => {
      let level = 3 + bevel(tile, u, v) + speckle(tile, u, v) * 0.5;
      if (inMotif(u, v)) {
        level = 1;
      }
      else if (inMotif(u - 1, v) || inMotif(u, v - 1)) {
        level = palette.size - 1;
      }
      tile.set(u, v, palette.at(level));
    });
  };
}

interface VoronoiSeed {
  x: number;
  y: number;
}

function voronoiSeeds(
  tile: TileCanvas,
  count: number
): VoronoiSeed[] {
  return Array.from({ length: count }, (_, index) => {
    return {
      x: hash(index, 0, 11, tile.seed) * tile.size,
      y: hash(index, 0, 12, tile.seed) * tile.size
    };
  });
}

/**
 * Nearest seed of a pixel on the tile torus, and how much closer it is than
 * the second nearest; a small gap means the pixel lies on a cell border.
 */
function voronoi(
  { size }: TileCanvas,
  seeds: VoronoiSeed[],
  u: number,
  v: number
): { nearest: number; gap: number; } {
  let first = Infinity;
  let second = Infinity;
  let nearest = 0;

  for (const [index, seed] of seeds.entries()) {
    const dx = torusDelta(u + 0.5 - seed.x, size);
    const dy = torusDelta(v + 0.5 - seed.y, size);
    const distance = Math.hypot(dx, dy);
    if (distance < first) {
      second = first;
      first = distance;
      nearest = index;
    }
    else if (distance < second) {
      second = distance;
    }
  }

  return { nearest, gap: second - first };
}

function torusDelta(
  delta: number,
  size: number
): number {
  const half = size / 2;

  return ((delta + half) % size + size) % size - half;
}
