// Import Internal Dependencies
import { B, type Block } from "../blocks/index.ts";
import type { Brush } from "../builder/Brush.ts";
import { FloatingIsland, GROUND } from "../builder/FloatingIsland.ts";
import {
  monumentalArch,
  obelisk
} from "../builder/prefabs.ts";
import { SITE } from "../site.ts";
import type { Random } from "../utils/random.ts";

// CONSTANTS
const kDeck = GROUND;
const kHalfWidth = 8;
/**
 * The round garden halfway along, on its own islet: its centre in local x
 * and its radius.
 */
const kGarden = { x: 85, radius: 16 };
/**
 * Pier centres in local x. The platform (x = 0), the garden islet and the
 * pyramid's plinth (x = `SITE.path.length`) are the other supports.
 */
const kPiers = [22, 50, 120, 148];
const kPierHalf = { x: 3, z: kHalfWidth + 5 };
/**
 * How far the piers hang under the deck before their foot islet.
 */
const kPierDepth = 30;

interface Span {
  from: number;
  to: number;
}

/**
 * A viaduct from the platform to the pyramid, after the corridor
 * inspiration: tall piers hanging into small floating islets, semicircular
 * arches between them under a crenellated parapet, and a monumental arch
 * over the deck on every pier. Halfway along, the deck opens onto a round
 * walled garden.
 */
export function buildPath(
  b: Brush,
  random: Random
): void {
  const { length } = SITE.path;
  const supports = [
    ...kPiers.map((x) => [x - kPierHalf.x - 1, x + kPierHalf.x + 1]),
    [kGarden.x - kGarden.radius + 1, kGarden.x + kGarden.radius - 1]
  ].sort(([a], [b]) => a - b);
  const faces = [0, ...supports.flat(), length];
  const spans: Span[] = [];
  for (let index = 0; index < faces.length; index += 2) {
    spans.push({ from: faces[index], to: faces[index + 1] });
  }

  for (const x of kPiers) {
    buildPier(b, x, random);
  }
  for (const span of spans) {
    buildSpan(b, span);
  }
  buildGarden(b, random);
  buildDeck(b);
  for (const x of kPiers) {
    monumentalArch(b, [x, kDeck, 0], kHalfWidth + 3);
  }
}

/**
 * A pier from the deck down to a floating islet: frieze bands every eight
 * courses and limestone pilasters on its long faces, narrowing in two steps
 * towards its foot.
 */
function buildPier(
  b: Brush,
  x: number,
  random: Random
): void {
  const bottom = kDeck - kPierDepth;

  b.fill([x - kPierHalf.x, bottom, -kPierHalf.z], [x + kPierHalf.x, kDeck - 1, kPierHalf.z], (px, y, z) => {
    let inset = 0;
    if (y < bottom + 8) {
      inset = 2;
    }
    else if (y < bottom + 16) {
      inset = 1;
    }
    if (Math.abs(px - x) > kPierHalf.x - inset || Math.abs(z) > kPierHalf.z - inset * 2) {
      return undefined;
    }
    if ((kDeck - y) % 8 === 4) {
      return B.trim;
    }
    const face = Math.abs(px - x) === kPierHalf.x - inset;

    return face && Math.abs(z) % 4 === 0 ? B.limestone : B.ashlar;
  });

  const islet = new FloatingIsland({
    radius: 9,
    depth: 12,
    surface: "grass",
    flatRadius: 5,
    seed: Math.floor(random() * 2 ** 31)
  });
  islet.build(b.translated([x, bottom - GROUND, 0]));
}

/**
 * The solid between two supports: a semicircular intrados edged by a frieze
 * line and a limestone ring, with sandstone spandrels above it.
 */
function buildSpan(
  b: Brush,
  { from, to }: Span
): void {
  const radius = (to - from) / 2;
  const centre = (from + to) / 2;
  const springLine = kDeck - 3 - radius;

  for (let x = from; x <= to; x++) {
    const d = Math.abs(x - centre);
    const intrados = Math.round(springLine + Math.sqrt(Math.max(0, radius * radius - d * d)));
    for (let y = intrados; y <= kDeck - 3; y++) {
      const ring = y - intrados;
      let block: Block = B.sandstone;
      if (ring === 0) {
        block = B.trim;
      }
      else if (ring < 3) {
        block = B.limestone;
      }
      b.box([x, y, -kHalfWidth], [x, y, kHalfWidth], block);
    }
  }
}

/**
 * Two courses of ashlar under a flagstone walk, edged by a frieze course
 * and a crenellated limestone parapet, on either side of the garden.
 */
function buildDeck(
  b: Brush
): void {
  const { length } = SITE.path;
  const segments = [
    [0, kGarden.x - kGarden.radius + 2],
    [kGarden.x + kGarden.radius - 2, length]
  ];

  for (const [from, to] of segments) {
    b.clear([from, kDeck, -kHalfWidth], [to, kDeck + 8, kHalfWidth]);
    b.box([from, kDeck - 2, -kHalfWidth], [to, kDeck - 1, kHalfWidth], B.ashlar);
    b.box([from, kDeck, -kHalfWidth + 1], [to, kDeck, kHalfWidth - 1], B.flagstone);
    for (const z of [-kHalfWidth, kHalfWidth]) {
      b.box([from, kDeck, z], [to, kDeck, z], B.trim);
      b.box([from, kDeck + 1, z], [to, kDeck + 1, z], B.limestone);
      for (let x = from + 1; x < to; x += 3) {
        b.put([x, kDeck + 2, z], B.limestone.slabBottom);
      }
    }
  }
}

/**
 * A round walled garden on its own islet: a ring walk around a lawn with an
 * obelisk on a small plaza, paths out to the parapet through a hedge ring,
 * and the parapet open where the deck comes in.
 */
function buildGarden(
  b: Brush,
  random: Random
): void {
  const { x: cx, radius } = kGarden;
  const islet = new FloatingIsland({
    radius,
    depth: 22,
    roughness: 0,
    surface: "grass",
    flatRadius: radius,
    seed: Math.floor(random() * 2 ** 31)
  });
  islet.build(b.translated([cx, 0, 0]));

  const reach = radius + 1;
  b.fill([cx - reach, kDeck, -reach], [cx + reach, kDeck + 2, reach], (x, y, z) => {
    const dx = x - cx;
    const r = Math.hypot(dx, z);
    if (r >= radius) {
      return undefined;
    }
    const entrance = Math.abs(z) < kHalfWidth && Math.abs(dx) > radius - 4;
    if (r >= radius - 1) {
      if (entrance) {
        return y === kDeck ? B.flagstone : undefined;
      }
      if (y === kDeck) {
        return B.trim;
      }

      return y === kDeck + 1 || Math.round(Math.atan2(z, dx) * radius) % 3 === 0 ? B.limestone : undefined;
    }
    // Paths cross the outer lawn only; inside the ring walk, a small plaza.
    const crossing = r >= 8 && (Math.abs(z) <= 2 || Math.abs(dx) <= 1);
    const paved = crossing || (r >= 6 && r < 8) || r < 3 || entrance;
    if (y === kDeck) {
      return paved ? B.flagstone : B.grass;
    }
    const hedgeRing = r >= 11 && r < 12.5;

    return y === kDeck + 1 && hedgeRing && !paved ? B.leaves : undefined;
  });
  obelisk(b, [cx, kDeck + 1, 0], 12);
}
