// Import Internal Dependencies
import { hash, lerp, smooth } from "../../utils/noise.ts";

// CONSTANTS
/**
 * Size of an atlas tile, in pixels.
 */
export const TILE_SIZE = 32;
/**
 * Size the pixel-art painters (masonry, inlays) are drawn at before being
 * doubled into an atlas tile, see `lowRes`.
 */
const kLowResSize = 16;

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
    return this.#levels[this.#clamp(Math.round(level))];
  }

  /**
   * Blends the two levels around a fractional `level`, for soft gradients
   * that still stay within the material's colours.
   */
  mix(
    level: number
  ): Rgba {
    const low = this.#clamp(Math.floor(level));
    const high = this.#clamp(low + 1);
    const t = Math.max(0, Math.min(1, level - low));
    const [r0, g0, b0] = this.#levels[low];
    const [r1, g1, b1] = this.#levels[high];

    return [lerp(r0, r1, t), lerp(g0, g1, t), lerp(b0, b1, t), 255];
  }

  #clamp(
    index: number
  ): number {
    return Math.max(0, Math.min(this.#levels.length - 1, index));
  }
}

export const TRANSPARENT: Rgba = [0, 0, 0, 0];

/**
 * `color` darkened (factor below 1) or lightened (above 1), alpha kept.
 */
export function shade(
  [r, g, b, a]: Rgba,
  factor: number
): Rgba {
  return [r * factor, g * factor, b * factor, a];
}

export function parseHex(
  hex: string
): Rgba {
  const value = Number.parseInt(hex.slice(1), 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
}

/**
 * A square pixel buffer being painted. `seed` differs for every atlas cell,
 * so alternate tiles of one material come out different. Coordinates wrap
 * on the tile torus, so patterns that reach past an edge continue on the
 * opposite side and tiles repeat seamlessly.
 */
export class TileCanvas {
  readonly size: number;
  readonly pixels: Uint8ClampedArray<ArrayBuffer>;
  readonly seed: number;

  constructor(
    seed: number,
    size = TILE_SIZE
  ) {
    this.seed = seed;
    this.size = size;
    this.pixels = new Uint8ClampedArray(size * size * 4);
  }

  wrap(
    coordinate: number
  ): number {
    return ((coordinate % this.size) + this.size) % this.size;
  }

  set(
    u: number,
    v: number,
    [r, g, b, a]: Rgba
  ): void {
    this.pixels.set([r, g, b, a], this.#offset(u, v));
  }

  get(
    u: number,
    v: number
  ): Rgba {
    const offset = this.#offset(u, v);
    const [r, g, b, a] = this.pixels.subarray(offset, offset + 4);

    return [r, g, b, a];
  }

  alpha(
    u: number,
    v: number
  ): number {
    return this.pixels[this.#offset(u, v) + 3];
  }

  /**
   * Per-pixel noise in [0, 1). `salt` gives independent streams.
   */
  noise(
    u: number,
    v: number,
    salt = 0
  ): number {
    return hash(this.wrap(u), this.wrap(v), salt, this.seed);
  }

  /**
   * Smooth value noise in [0, 1) with features `period` pixels apart. The
   * period must divide the tile size, so the noise wraps seamlessly.
   */
  smoothNoise(
    u: number,
    v: number,
    period: number,
    salt = 0
  ): number {
    const cells = this.size / period;
    const x = u / period;
    const y = v / period;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const corner = (cx: number, cy: number) => hash(
      ((cx % cells) + cells) % cells,
      ((cy % cells) + cells) % cells,
      salt,
      this.seed + period
    );

    return lerp(
      lerp(corner(x0, y0), corner(x0 + 1, y0), tx),
      lerp(corner(x0, y0 + 1), corner(x0 + 1, y0 + 1), tx),
      ty
    );
  }

  /**
   * Calls `paint` for every pixel, top-left first.
   */
  each(
    paint: (u: number, v: number) => void
  ): void {
    for (let v = 0; v < this.size; v++) {
      for (let u = 0; u < this.size; u++) {
        paint(u, v);
      }
    }
  }

  #offset(
    u: number,
    v: number
  ): number {
    return (this.wrap(v) * this.size + this.wrap(u)) * 4;
  }
}

export type TilePainter = (tile: TileCanvas) => void;

/**
 * Paints a pixel-art pattern designed for 16×16 and doubles every pixel into
 * the atlas tile, so crisp masonry keeps its scale next to the smooth,
 * full-resolution ground tiles.
 */
export function lowRes(
  painter: TilePainter
): TilePainter {
  return (tile) => {
    const small = new TileCanvas(tile.seed, kLowResSize);
    painter(small);

    const scale = tile.size / kLowResSize;
    tile.each((u, v) => tile.set(u, v, small.get(Math.floor(u / scale), Math.floor(v / scale))));
  };
}
