// Import Internal Dependencies
import { B } from "../blocks/index.ts";
import type { Brush } from "../builder/Brush.ts";
import { FloatingIsland, GROUND } from "../builder/FloatingIsland.ts";
import {
  colonnade,
  flowerBed,
  monumentalArch,
  obelisk,
  palm
} from "../builder/prefabs.ts";
import { SITE } from "../site.ts";
import type { Random } from "../utils/random.ts";

// CONSTANTS
const kDeck = GROUND;
const kHalfWidth = 5;

interface PathSection {
  kind: "arch" | "garden";
  from: number;
  to: number;
}

interface Garden {
  section: PathSection;
  islet: FloatingIsland;
}

/**
 * Alternating arch and garden sections, in local x.
 */
const kSections: PathSection[] = [
  { kind: "arch", from: 2, to: 16 },
  { kind: "garden", from: 17, to: 45 },
  { kind: "arch", from: 46, to: 60 },
  { kind: "garden", from: 61, to: 89 },
  { kind: "arch", from: 90, to: 108 }
];

/**
 * An 11-wide causeway from the platform to the pyramid. Arch sections are
 * bridges with arched undersides, entered through a monumental arch between
 * colonnades; garden sections rest on small floating islets around a water
 * channel.
 */
export function buildPath(
  b: Brush,
  random: Random
): void {
  const gardens: Garden[] = kSections.filter(({ kind }) => kind === "garden").map((section) => {
    const islet = new FloatingIsland({
      radius: (section.to - section.from) / 2 + 1,
      depth: 16,
      surface: "grass",
      flatRadius: 6,
      seed: Math.floor(random() * 2 ** 31)
    });

    return { section, islet };
  });
  // The islets go first: the deck cuts through their tops.
  for (const { section, islet } of gardens) {
    islet.build(b.translated([centreOf(section), 0, 0]));
  }

  buildDeck(b);
  for (const section of kSections.filter(({ kind }) => kind === "arch")) {
    buildArchSection(b, section);
  }
  for (const garden of gardens) {
    buildGardenSection(b, garden, random);
  }
}

function centreOf(
  { from, to }: PathSection
): number {
  return Math.round((from + to) / 2);
}

/**
 * Two courses of ashlar under a kerbed walkway with a low parapet.
 */
function buildDeck(
  b: Brush
): void {
  const { length } = SITE.path;

  b.clear([0, kDeck - 2, -kHalfWidth], [length, kDeck + 8, kHalfWidth]);
  b.box([0, kDeck - 2, -kHalfWidth], [length, kDeck - 1, kHalfWidth], B.ashlar);
  for (const z of [-kHalfWidth, kHalfWidth]) {
    b.box([0, kDeck, z], [length, kDeck, z], B.trim);
    b.box([0, kDeck + 1, z], [length, kDeck + 1, z], B.limestone.slabBottom);
  }
}

function buildArchSection(
  b: Brush,
  { from, to }: PathSection
): void {
  // An arched underside: deep at the section ends, thin at mid-span.
  for (let x = from - 1; x <= to + 1; x++) {
    const t = (x - from + 1) / (to - from + 2);
    const depth = 1 + Math.round(6 * (1 - Math.sin(Math.PI * t)));
    b.box([x, kDeck - 2 - depth, -kHalfWidth + 1], [x, kDeck - 3, kHalfWidth - 1], B.ashlar);
    b.box([x, kDeck - 3, -kHalfWidth], [x, kDeck - 3, kHalfWidth], B.trim);
  }

  b.box([from, kDeck, -kHalfWidth + 1], [to, kDeck, kHalfWidth - 1], B.flagstone);
  for (let x = from + 1; x < to; x += 3) {
    b.put([x, kDeck, 0], B.faience);
  }

  // Landing under the arch's pylons, which stand beyond the deck edges.
  const arch = from + 2;
  b.box([arch - 2, kDeck - 3, -9], [arch + 2, kDeck - 1, 9], B.ashlar);
  monumentalArch(b, [arch, kDeck, 0]);

  colonnade(b, [arch + 5, kDeck + 1, -kHalfWidth + 1], to - 1, 7);
  colonnade(b, [arch + 5, kDeck + 1, kHalfWidth - 1], to - 1, 7);
}

function buildGardenSection(
  b: Brush,
  { section, islet }: Garden,
  random: Random
): void {
  const { from, to } = section;
  const centre = centreOf(section);
  function onIslet(x: number, z: number): [number, number, number] {
    return [x, islet.surfaceAt(x - centre, z) ?? kDeck, z];
  }

  b.box([from, kDeck, -kHalfWidth + 1], [to, kDeck, kHalfWidth - 1], B.grass);

  // A sunken channel between limestone kerbs.
  b.box([from, kDeck, -2], [to, kDeck, 2], B.limestone);
  b.clear([from + 1, kDeck, -1], [to - 1, kDeck, 1]);
  b.box([from + 1, kDeck - 1, -1], [to - 1, kDeck - 1, 1], B.faience);
  b.pool([(from + to) / 2, kDeck + 0.8, 0], to - from - 1, 3);

  for (let x = from + 1; x + 3 < to; x += 5) {
    for (const [z0, z1] of [[-4, -3], [3, 4]]) {
      flowerBed(b, [x, kDeck + 1, z0], [x + 3, kDeck + 1, z1], random);
    }
    b.put([x + 4, kDeck + 1, -3], B.papyrus);
    b.put([x + 4, kDeck + 1, 3], B.papyrus);
  }
  for (let side = 1, x = from + 3; x < to - 2; side = -side, x += 7) {
    palm(b, onIslet(x, side * 8), 6 + Math.floor(random() * 3));
  }
  for (const x of [from + 1, to - 1]) {
    obelisk(b, onIslet(x, -8), 8);
    obelisk(b, onIslet(x, 8), 8);
  }
}
