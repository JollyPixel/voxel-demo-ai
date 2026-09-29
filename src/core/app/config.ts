/**
 * Strength of the ambient occlusion the mesher bakes into chunk faces.
 */
export const AO_STRENGTH = 0.75;

/**
 * Edge of a chunk, in voxels. View and flat-tile distances are counted in
 * chunks.
 */
export const CHUNK_SIZE = 32;

/**
 * Upper bound of the `far` distance, in chunks.
 */
export const MAX_FAR_CHUNKS = 24;

/**
 * The engine's `range.farDistance` for a distance in chunks; 0 turns it off.
 */
export function farDistance(
  chunks: number
): number {
  return chunks === 0 ? Infinity : chunks;
}

/**
 * Chunks of an engine `range.farDistance`; Infinity reads as 0.
 */
export function farChunks(
  distance: number
): number {
  return Number.isFinite(distance) ? distance : 0;
}

// CONSTANTS
/**
 * Default flat-tile distance, in chunks (256 world units).
 */
const kDefaultFarChunks = 8;

/**
 * Upper bound of the `workers` parameter.
 */
const kMaxWorkers = 16;
const kDefaultWorkers = 4;

/**
 * Demo settings, read from the page's query string (see README).
 */
export interface DemoConfig {
  world: string;
  seed: number;
  /**
   * Scene copies tiled on a grid, for stress testing.
   */
  copies: number;
  shadows: boolean;
  /**
   * Ambient occlusion baked into the chunk faces by the mesher.
   */
  ao: boolean;
  /**
   * Screen-space ambient occlusion (GTAO) as a camera post-process.
   */
  gtao: boolean;
  /**
   * Weighted blended transparency for the water, as the camera's scene pass.
   */
  oit: boolean;
  /**
   * Distant tiles fade to their average colour, so they do not sparkle.
   */
  mips: boolean;
  /**
   * Chunks from the camera beyond which faces draw in their tile's flat
   * average colour; 0 keeps full detail.
   */
  far: number;
  /**
   * Web Workers that mesh chunks; 0 meshes on the main thread. Workers need a
   * cross-origin isolated page; without one the engine meshes on the main
   * thread.
   */
  workers: number;
  /**
   * Starting camera pose; the world's default when absent or unknown.
   */
  view: string | null;
}

export function readConfig(
  search: string,
  defaultWorld: string
): DemoConfig {
  const params = new URLSearchParams(search);

  function clamped(key: string, fallback: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Number(params.get(key)) || fallback));
  }

  // Unlike clamped(), 0 is a valid value: distances and workers turn off.
  function count(key: string, fallback: number, max: number): number {
    const value = Number(params.get(key) ?? Number.NaN);

    return Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : fallback;
  }

  return {
    world: params.get("world") ?? (params.get("pad") === "1" ? "test-pad" : defaultWorld),
    seed: clamped("seed", 1337, 1, 0x7fffffff),
    copies: clamped("copies", 1, 1, 4),
    shadows: params.get("shadows") !== "0",
    ao: params.get("ao") !== "0",
    gtao: params.get("gtao") === "1",
    oit: params.get("oit") === "1",
    mips: params.get("mips") !== "0",
    far: count("far", kDefaultFarChunks, MAX_FAR_CHUNKS),
    workers: count("workers", defaultWorkerCount(), kMaxWorkers),
    view: params.get("view")
  };
}

/**
 * Four workers stalled the main thread less than one per core on the Valley
 * Shrine (FEEDBACK F-13); a spare core is left for the page.
 */
function defaultWorkerCount(): number {
  return Math.max(1, Math.min(kDefaultWorkers, navigator.hardwareConcurrency - 1));
}
