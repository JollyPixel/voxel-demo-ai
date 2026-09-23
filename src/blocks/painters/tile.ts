// Import Internal Dependencies
import { hash } from "../../utils/noise.ts";

// CONSTANTS
export const TILE_SIZE = 16;

export type Rgba = readonly [r: number, g: number, b: number, a: number];

/**
 * Colours of one material from darkest to lightest. Painters pick a level and
 * let `Palette.at` clamp it, so shading offsets never fall off either end.
 */
export class Palette {
  readonly #levels: Rgba[];

  constructor(
    ...hexes: string[]
  ) {
    this.#levels = hexes.map(parseHex);
  }

  get size(): number {
    return this.#levels.length;
  }

  at(
    level: number
  ): Rgba {
    const index = Math.max(0, Math.min(this.#levels.length - 1, Math.round(level)));

    return this.#levels[index];
  }
}

export const TRANSPARENT: Rgba = [0, 0, 0, 0];

export function parseHex(
  hex: string
): Rgba {
  const value = Number.parseInt(hex.slice(1), 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
}

/**
 * A 16×16 pixel buffer being painted. `seed` differs for every atlas cell,
 * so alternate tiles of one material come out different.
 */
export class TileCanvas {
  readonly pixels = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
  readonly seed: number;

  constructor(
    seed: number
  ) {
    this.seed = seed;
  }

  set(
    u: number,
    v: number,
    [r, g, b, a]: Rgba
  ): void {
    const offset = (wrap(v) * TILE_SIZE + wrap(u)) * 4;
    this.pixels.set([r, g, b, a], offset);
  }

  alpha(
    u: number,
    v: number
  ): number {
    return this.pixels[(wrap(v) * TILE_SIZE + wrap(u)) * 4 + 3];
  }

  /**
   * Per-pixel noise in [0, 1). `salt` gives independent streams.
   */
  noise(
    u: number,
    v: number,
    salt = 0
  ): number {
    return hash(wrap(u), wrap(v), salt, this.seed);
  }

  /**
   * Calls `paint` for every pixel, top-left first.
   */
  each(
    paint: (u: number, v: number) => void
  ): void {
    for (let v = 0; v < TILE_SIZE; v++) {
      for (let u = 0; u < TILE_SIZE; u++) {
        paint(u, v);
      }
    }
  }
}

export type TilePainter = (tile: TileCanvas) => void;

/**
 * Coordinates on the tile torus, so patterns that reach past an edge
 * continue on the opposite side and tiles repeat seamlessly.
 */
export function wrap(
  coordinate: number
): number {
  return ((coordinate % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
}
