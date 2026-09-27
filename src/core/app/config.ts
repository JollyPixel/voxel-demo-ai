/**
 * Strength of the ambient occlusion the mesher bakes into chunk vertices.
 */
export const AO_STRENGTH = 0.75;

/**
 * Edge of a chunk, in voxels. Detail distances are counted in chunks.
 */
export const CHUNK_SIZE = 32;

/**
 * Upper bound of the `far` and `lod` detail distances, in chunks.
 */
export const MAX_DETAIL_CHUNKS = 24;

/**
 * World units of a detail distance given in chunks; 0 turns it off.
 */
export function detailDistance(
  chunks: number
): number {
  return chunks === 0 ? Infinity : chunks * CHUNK_SIZE;
}

/**
 * Chunks of a detail distance in world units; Infinity reads as 0.
 */
export function detailChunks(
  distance: number
): number {
  return Number.isFinite(distance) ? Math.round(distance / CHUNK_SIZE) : 0;
}

// CONSTANTS
/**
 * Default detail distances, in chunks (256 and 384 world units). From the
 * Valley Shrine overview only the far peaks drop to half resolution; the
 * distant copies of `?copies=4` do too.
 */
const kDefaultFarChunks = 8;
const kDefaultLodChunks = 12;

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
  /**
   * Greedy meshing; the engine ignores vertex pulling while it is on.
   */
  greedy: boolean;
  /**
   * Chunks store one 8-byte record per face; the vertex shader rebuilds the
   * corners from a shared face template table.
   */
  pulling: boolean;
  shadows: boolean;
  /**
   * Ambient occlusion baked into the chunk vertices by the mesher.
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
   * Chunks from the camera beyond which chunks mesh at half resolution;
   * 0 keeps full detail.
   */
  lod: number;
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

  // Unlike clamped(), 0 is a valid value: it turns the distance off.
  function chunks(key: string, fallback: number): number {
    const value = Number(params.get(key) ?? Number.NaN);

    return Number.isFinite(value) ? Math.max(0, Math.min(MAX_DETAIL_CHUNKS, Math.round(value))) : fallback;
  }

  return {
    world: params.get("world") ?? (params.get("pad") === "1" ? "test-pad" : defaultWorld),
    seed: clamped("seed", 1337, 1, 0x7fffffff),
    copies: clamped("copies", 1, 1, 4),
    greedy: params.get("greedy") === "1",
    pulling: params.get("pulling") !== "0",
    shadows: params.get("shadows") !== "0",
    ao: params.get("ao") !== "0",
    gtao: params.get("gtao") === "1",
    oit: params.get("oit") === "1",
    mips: params.get("mips") !== "0",
    far: chunks("far", kDefaultFarChunks),
    lod: chunks("lod", kDefaultLodChunks),
    view: params.get("view")
  };
}
