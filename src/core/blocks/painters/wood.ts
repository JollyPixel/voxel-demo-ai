// Import Internal Dependencies
import { hash } from "../../utils/noise.ts";
import type { Palette, TilePainter } from "./tile.ts";

export interface PlankOptions {
  /**
   * Board width in pixels; must divide the tile size.
   * @default 8
   */
  board?: number;
  /**
   * Boards run up the face instead of across it.
   * @default false
   */
  vertical?: boolean;
}

/**
 * Boards laid side by side: each board has its own tone, a lit and a shaded
 * edge, a butt joint at a random point and a fine grain along its length.
 */
export function planks(
  palette: Palette,
  options: PlankOptions = {}
): TilePainter {
  const { board = 8, vertical = false } = options;
  const middle = (palette.size - 1) / 2;

  return (tile) => tile.each((u, v) => {
    const [along, across] = vertical ? [v, u] : [u, v];
    const row = Math.floor(across / board);
    const y = across % board;
    const joint = Math.floor(hash(row, 0, 5, tile.seed) * tile.size);
    if (y === board - 1 || tile.wrap(along - joint) === 0) {
      tile.set(u, v, palette.mix(0.3));

      return;
    }

    let level = middle + (hash(row, 1, 5, tile.seed) - 0.5) * 0.9;
    if (y === 0) {
      level += 0.7;
    }
    else if (y === board - 2) {
      level -= 0.5;
    }
    const grain = Math.sin((across + tile.smoothNoise(u, v, 16, 3) * 5) * 2.4);
    level += grain * 0.22 + (tile.noise(u, v, 4) - 0.5) * 0.2;
    tile.set(u, v, palette.mix(level));
  });
}

/**
 * Lacquered timber: an even, glossy coat over a faint vertical grain, with a
 * lit rim on the top and left of the block and a shaded one opposite.
 */
export function lacquer(
  palette: Palette
): TilePainter {
  const middle = (palette.size - 1) / 2;

  return (tile) => tile.each((u, v) => {
    let level = middle + (tile.smoothNoise(u, v, 16, 1) - 0.5) * 0.5 + (tile.noise(u, 0, 2) - 0.5) * 0.35;
    if (u === 0 || v === 0) {
      level += 0.9;
    }
    else if (u === tile.size - 1 || v === tile.size - 1) {
      level -= 1;
    }
    tile.set(u, v, palette.mix(level + (tile.noise(u, v, 3) - 0.5) * 0.12));
  });
}

/**
 * Lime plaster: a pale, barely mottled wall with a soft rim.
 */
export function plaster(
  palette: Palette
): TilePainter {
  const top = palette.size - 1;

  return (tile) => tile.each((u, v) => {
    let level = top - 1 + (tile.smoothNoise(u, v, 8, 1) - 0.5) * 0.9 + (tile.noise(u, v, 2) - 0.5) * 0.3;
    if (u === tile.size - 1 || v === tile.size - 1) {
      level -= 1.2;
    }
    tile.set(u, v, palette.mix(level));
  });
}

/**
 * Shoji screen, drawn at 16×16: rice paper in a grid of thin wooden bars.
 */
export function shoji(
  frame: Palette,
  paper: Palette
): TilePainter {
  return (tile) => tile.each((u, v) => {
    if (u === 0 || v === 0) {
      tile.set(u, v, frame.at(0));

      return;
    }
    if (u % 4 === 0 || v % 5 === 0) {
      tile.set(u, v, frame.at(u % 4 === 0 ? 1 : 2));

      return;
    }
    // Light glows through the paper, brightest at the centre of each pane.
    const glow = 1 - Math.abs((u % 4) - 2) * 0.3;
    tile.set(u, v, paper.mix(paper.size - 2.2 + glow + (tile.noise(u, v, 1) - 0.5) * 0.4));
  });
}

/**
 * Bamboo culm: a cylinder lit from the left, repeating every eight pixels so
 * a thin pole shows one, with a node ring at the top of every block.
 */
export function bamboo(
  palette: Palette
): TilePainter {
  const middle = (palette.size - 1) / 2;
  const culm = 8;

  return (tile) => tile.each((u, v) => {
    if (v === 0) {
      tile.set(u, v, palette.mix(0.6));

      return;
    }
    const x = u % culm;
    let level = middle + Math.cos(((x + 0.5) / culm) * Math.PI) * 1.3 + (tile.noise(u, 0, 1) - 0.5) * 0.3;
    if (v === 1) {
      level += 0.8;
    }
    tile.set(u, v, palette.mix(level + (tile.noise(u, v, 2) - 0.5) * 0.15));
  });
}

/**
 * Paper lantern, drawn at 16×16: a warm glow under horizontal ribs, brightest
 * in the middle, between dark wooden rims.
 */
export function paperLantern(
  paper: Palette,
  frame: Palette
): TilePainter {
  const top = paper.size - 1;

  return (tile) => tile.each((u, v) => {
    if (v <= 1 || v >= tile.size - 2) {
      tile.set(u, v, frame.at(v === 1 || v === tile.size - 2 ? 2 : 0));

      return;
    }
    const glow = top - Math.abs(u - 7.5) / 8 * 1.8 - Math.abs(v - 7.5) / 8 * 0.8;
    tile.set(u, v, paper.mix(v % 3 === 0 ? glow - 1.1 : glow));
  });
}
