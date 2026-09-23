/**
 * Integer hash of a lattice point, returning a float in [0, 1). Stateless, so
 * a position always gets the same value whatever the build order.
 */
export function hash(
  x: number,
  y: number,
  z: number,
  seed: number
): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x1b873593) ^ Math.imul(seed | 0, 0x68e31da4);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(
  t: number
): number {
  return t * t * (3 - 2 * t);
}

/**
 * Smooth 2D value noise in [0, 1) with features about one unit apart.
 */
export function valueNoise(
  x: number,
  z: number,
  seed: number
): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smooth(x - x0);
  const tz = smooth(z - z0);
  const top = lerp(hash(x0, 0, z0, seed), hash(x0 + 1, 0, z0, seed), tx);
  const bottom = lerp(hash(x0, 0, z0 + 1, seed), hash(x0 + 1, 0, z0 + 1, seed), tx);

  return lerp(top, bottom, tz);
}

/**
 * Fractal sum of `octaves` value-noise layers, normalised to [0, 1).
 */
export function fbm(
  x: number,
  z: number,
  seed: number,
  octaves = 4
): number {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    const scale = 2 ** octave;
    sum += valueNoise(x * scale, z * scale, seed + octave * 101) * amplitude;
    total += amplitude;
    amplitude /= 2;
  }

  return sum / total;
}

export function lerp(
  a: number,
  b: number,
  t: number
): number {
  return a + (b - a) * t;
}
