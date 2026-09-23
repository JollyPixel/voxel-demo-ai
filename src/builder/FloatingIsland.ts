// Import Internal Dependencies
import { B, type Block } from "../blocks/index.ts";
import { fbm, hash } from "../utils/noise.ts";
import type { Brush } from "./Brush.ts";

// CONSTANTS
/**
 * y of the first air cell above island ground; the ground voxels sit at
 * `GROUND - 1`.
 */
export const GROUND = 20;
const kSoilDepth = 3;
const kShell = 2;

export interface FloatingIslandOptions {
  /**
   * Mean outline radius. The outline wobbles by `±roughness` of it.
   */
  radius: number;
  /**
   * Rock depth under the centre, before noise and hanging spires.
   */
  depth: number;
  /**
   * @default 0.08
   */
  roughness?: number;
  /**
   * Surface material: lawn with soil under it, or desert sand.
   */
  surface: "grass" | "sand";
  /**
   * Radius kept perfectly flat for buildings. Beyond it the ground rolls
   * gently up to the rim.
   * @default radius * 0.7
   */
  flatRadius?: number;
  seed: number;
}

interface Column {
  top: number;
  bottom: number;
}

/**
 * A floating island in local coordinates, centred on the origin: a noisy
 * outline, a gently rolling surface and a deep inverted cone of layered rock
 * with hanging spires.
 */
export class FloatingIsland {
  readonly options: Required<FloatingIslandOptions>;
  readonly #columns = new Map<string, Column>();

  constructor(
    options: FloatingIslandOptions
  ) {
    this.options = {
      roughness: 0.08,
      flatRadius: options.radius * 0.7,
      ...options
    };
    this.#shape();
  }

  /**
   * Outline radius in the direction of (x, z).
   */
  radiusToward(
    x: number,
    z: number
  ): number {
    const { radius, roughness, seed } = this.options;
    const angle = Math.atan2(z, x);
    const wobble = fbm(Math.cos(angle) * 2 + 10, Math.sin(angle) * 2 + 10, seed, 3);

    return radius * (1 - roughness + wobble * roughness * 2);
  }

  /**
   * Height of the ground surface (first air cell) at (x, z), if on the island.
   */
  surfaceAt(
    x: number,
    z: number
  ): number | undefined {
    const column = this.#columns.get(`${x},${z}`);

    return column ? column.top + 1 : undefined;
  }

  build(
    b: Brush
  ): void {
    for (const [key, { top, bottom }] of this.#columns) {
      const [x, z] = key.split(",").map(Number);
      const [hiddenFrom, hiddenTo] = this.#hiddenRange(x, z, bottom);

      for (let y = bottom; y <= top; y++) {
        if (y >= hiddenFrom && y <= hiddenTo) {
          continue;
        }
        b.put([x, y, z], this.#materialAt(x, y, z, top));
      }
    }
  }

  #shape(): void {
    const { radius, depth, flatRadius, seed } = this.options;
    const reach = Math.ceil(radius * 1.2);

    for (let z = -reach; z <= reach; z++) {
      for (let x = -reach; x <= reach; x++) {
        const distance = Math.hypot(x, z);
        const edge = this.radiusToward(x, z);
        if (distance > edge) {
          continue;
        }
        const t = distance / edge;
        const rolling = distance > flatRadius ?
          Math.round(fbm(x / 9, z / 9, seed + 1) * 3 * Math.min(1, (distance - flatRadius) / 6)) :
          0;
        const top = GROUND - 1 + rolling;
        const spire = hash(x >> 1, 0, z >> 1, seed + 2) > 0.93 ? 4 + hash(x, 1, z, seed) * 10 : 0;
        const underside = depth * (1 - t ** 1.7) * (0.7 + fbm(x / 7, z / 7, seed + 3) * 0.6) + spire * (1 - t);
        this.#columns.set(`${x},${z}`, { top, bottom: Math.round(top - 1 - underside) });
      }
    }
  }

  /**
   * Cells of a column enclosed by rock on every side, a shell's thickness
   * away from any face. They are skipped: nothing ever sees inside the rock.
   */
  #hiddenRange(
    x: number,
    z: number,
    bottom: number
  ): [from: number, to: number] {
    let from = bottom + kShell;
    let to = Infinity;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbour = this.#columns.get(`${x + dx},${z + dz}`);
      if (!neighbour) {
        return [Infinity, -Infinity];
      }
      from = Math.max(from, neighbour.bottom + kShell);
      to = Math.min(to, neighbour.top - kSoilDepth);
    }

    return [from, to];
  }

  #materialAt(
    x: number,
    y: number,
    z: number,
    top: number
  ): Block {
    const { surface, seed } = this.options;
    const below = top - y;
    if (surface === "sand" && below < kSoilDepth + 1) {
      return B.sand;
    }
    if (below === 0) {
      return B.grass;
    }
    if (below < kSoilDepth) {
      return B.dirt;
    }

    // Bedding planes that sag a little, darkening with depth.
    const band = Math.floor((y + fbm(x / 11, z / 11, seed + 4) * 4) / 4);
    if (y < GROUND - 16) {
      return band % 3 === 0 ? B.rock : B.basalt;
    }

    return band % 2 === 0 ? B.ochreRock : B.rock;
  }
}
