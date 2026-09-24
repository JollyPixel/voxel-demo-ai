export type Random = () => number;

/**
 * Mulberry32: a small, fast, seedable generator returning floats in [0, 1).
 * Every scene detail draws from it, so a seed reproduces the same world.
 */
export function createRandom(
  seed: number
): Random {
  let state = seed;

  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Numerical Recipes LCG returning raw 32-bit states. Cheap enough for texel
 * noise, where the low-quality low bits are discarded by the caller.
 */
export function createLcg(
  seed: number
): () => number {
  let state = seed;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;

    return state >>> 0;
  };
}
