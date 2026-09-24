// Import Internal Dependencies
import type { BlockSet } from "./blocks/registry.ts";
import type { Brush, Vec3 } from "./builder/Brush.ts";
import type { Atmosphere } from "./scene/atmosphere.ts";
import { createRandom, type Random } from "./utils/random.ts";

export interface Zone {
  name: string;
  /**
   * World position of the zone's local origin.
   */
  origin: Vec3;
  build: (b: Brush, random: Random) => void;
}

export interface CameraPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

export interface WorldDefinition {
  id: string;
  title: string;
  blocks: BlockSet;
  /**
   * The scene, in build order. Zones share one random stream, so reordering
   * them reshuffles every seeded detail.
   */
  zones: readonly Zone[];
  /**
   * Bounds of one copy of the scene.
   */
  extent: Bounds;
  /**
   * Distance between scene copies tiled on a grid, for stress testing.
   */
  copySpacing: { x: number; z: number; };
  /**
   * Starting camera poses, selected with `?view=`.
   */
  views: Readonly<Record<string, CameraPose>>;
  defaultView: string;
  atmosphere: Atmosphere;
}

/**
 * Milliseconds spent writing voxels, by zone name.
 */
export type ZoneTimings = Record<string, number>;

/**
 * Builds `copies` copies of the world's scene from `seed`.
 */
export function buildZones(
  world: WorldDefinition,
  brush: Brush,
  options: { seed: number; copies: number; }
): ZoneTimings {
  const random = createRandom(options.seed);
  const timings: ZoneTimings = Object.fromEntries(world.zones.map(({ name }) => [name, 0]));

  for (const offset of copyOffsets(world, options.copies)) {
    const copy = brush.translated(offset);
    for (const zone of world.zones) {
      const start = performance.now();
      zone.build(copy.translated(zone.origin), random);
      timings[zone.name] += performance.now() - start;
    }
  }

  return timings;
}

/**
 * Bounds enclosing `count` copies of the world's scene.
 */
export function sceneBounds(
  world: WorldDefinition,
  count: number
): Bounds {
  const { min, max } = world.extent;
  const offsets = copyOffsets(world, count);
  const [maxX, , maxZ] = offsets[offsets.length - 1];

  return {
    min,
    max: [max[0] + maxX, max[1], max[2] + maxZ]
  };
}

/**
 * World offsets of `count` scene copies laid out on a square grid, used to
 * stress-test the renderer.
 */
export function copyOffsets(
  world: WorldDefinition,
  count: number
): Vec3[] {
  const columns = Math.ceil(Math.sqrt(count));
  const { x, z } = world.copySpacing;

  return Array.from({ length: count }, (_, index) => [
    (index % columns) * x,
    0,
    Math.floor(index / columns) * z
  ]);
}
