// Import Internal Dependencies
import type { MaterialSpec, SurfaceFinish } from "../../core/blocks/materials.ts";
import {
  bark,
  foliage,
  granular,
  grassSide,
  grassTop,
  rippledSand
} from "../../core/blocks/painters/ground.ts";
import {
  carved,
  flagstones,
  fluted,
  frieze,
  glazedTiles,
  inlaidStone,
  masonry,
  metal,
  rock,
  speckledStone
} from "../../core/blocks/painters/stone.ts";
import { lowRes, Palette } from "../../core/blocks/painters/tile.ts";

/**
 * World layers, from lowest to highest compositing priority: when two layers
 * hold a voxel in the same cell, the later one is drawn.
 */
export const LAYERS = ["Terrain", "Structure", "Garden"] as const;
export type Layer = typeof LAYERS[number];

export const FINISHES = {
  gold: { roughness: 0.38, metalness: 0.75 }
} as const satisfies Record<string, SurfaceFinish>;

// CONSTANTS
const kSandstone = new Palette("#8f7c52", "#b09c6c", "#cbb88a", "#dccc9f", "#e8dcb4", "#f4ecd0");
const kLimestone = new Palette("#8f8676", "#b9b09c", "#d8cfb8", "#e9e2cc", "#f4efe0", "#fffaf0");
const kUmber = new Palette("#24180f", "#3a2718", "#4f3522", "#65452c");
const kOchre = new Palette("#b9812f", "#e2ad55");
const kGranite = new Palette("#1e2027", "#2b2e37", "#383c47", "#474c59", "#5c6273");
const kGreyGranite = new Palette("#56565c", "#6b6b72", "#818189", "#96969d", "#adadb3");
const kFlecks = new Palette("#15161a", "#9a968f");
const kLapis = new Palette("#0f2447", "#16336a", "#1f4589", "#2b58a6", "#3a6fc2");
const kGold = new Palette("#7a5410", "#a8761b", "#d09a2a", "#eebd45", "#fbd970", "#fff2b5");
const kFaience = new Palette("#0e5a5c", "#15797a", "#1f9a96", "#3dbcb2", "#7fdcd0", "#d4fff7");
const kPaving = new Palette("#6f6a60", "#8d877a", "#a8a293", "#bfb9a9", "#d3cdbd");
const kGrass = new Palette("#3a7520", "#468a26", "#539e2c", "#62b033", "#74c03b", "#89cf45", "#a0dc55");
const kDirt = new Palette("#5a3a22", "#6b4629", "#7d5331", "#8f613a", "#a17045", "#b38052");
const kDesertSand = new Palette("#c08c45", "#cf9d52", "#dbad60", "#e5bc70", "#eecb84", "#f5d99a");
const kRock = new Palette("#4a403a", "#5e524a", "#74665b", "#8a7a6c", "#a0907f");
const kOchreRock = new Palette("#6b4a2c", "#86603a", "#a0784a", "#b88f5b", "#cda66f");
const kBasalt = new Palette("#2d2a30", "#3a363d", "#48434b", "#57515a", "#686169");
const kLeaves = new Palette("#1f4a1a", "#2a5f21", "#37752a", "#468c33", "#5aa43f", "#74bb4e");
const kAcaciaLeaves = new Palette("#34511b", "#436522", "#547a2a", "#688f34", "#7fa440", "#98b852");
const kBark = new Palette("#3b2818", "#4f3620", "#644429", "#7a5433", "#8f6541");

/**
 * Every material in the scene. Declaration order is the tile order in the
 * generated atlas. Ornaments and inlays are pixel art drawn at 16×16 and
 * doubled; masonry, ground, rock and foliage are painted at the full tile
 * size.
 */
export const MATERIALS = {
  // Masonry
  sandstone: {
    name: "Sandstone brick",
    layer: "Structure",
    tile: masonry(kSandstone, { course: 8, length: 16, stagger: 8 }),
    alternates: 3,
    variants: [
      "stair", "stairCornerInner", "stairCornerOuter",
      "ramp", "rampCornerInner", "rampCornerOuter",
      "slabBottom", "slabTop", "pole", "poleY"
    ]
  },
  ashlar: {
    name: "Sandstone ashlar",
    layer: "Structure",
    tile: masonry(kSandstone, { course: 16, length: 32, stagger: 16 }),
    alternates: 2,
    variants: ["stair", "stairCornerOuter", "slabBottom", "slabTop", "poleY"]
  },
  carved: {
    name: "Carved sandstone",
    layer: "Structure",
    tile: lowRes(carved(kSandstone))
  },
  limestone: {
    name: "Limestone",
    layer: "Structure",
    tile: masonry(kLimestone, { course: 16, length: 16, stagger: 8 }),
    alternates: 2,
    variants: ["stair", "stairCornerOuter", "slabBottom", "slabTop", "poleY"]
  },
  fluted: {
    name: "Fluted limestone",
    layer: "Structure",
    tile: fluted(kLimestone),
    faces: {
      top: masonry(kLimestone, { course: 32, length: 32, stagger: 0 }),
      bottom: masonry(kLimestone, { course: 32, length: 32, stagger: 0 })
    }
  },
  trim: {
    name: "Umber frieze",
    layer: "Structure",
    tile: lowRes(frieze(kUmber, kOchre)),
    variants: ["stair", "stairCornerOuter", "slabTop"]
  },
  flagstone: {
    name: "Flagstone",
    layer: "Structure",
    tile: lowRes(flagstones(kPaving)),
    alternates: 2,
    variants: ["slabBottom"]
  },
  granite: {
    name: "Dark granite",
    layer: "Structure",
    tile: lowRes(speckledStone(kGranite, kFlecks)),
    variants: ["slabBottom", "ramp"]
  },
  tombGranite: {
    name: "Tomb granite",
    layer: "Structure",
    tile: lowRes(speckledStone(kGreyGranite, kFlecks)),
    variants: ["slabBottom", "ramp", "poleY"]
  },

  // Inlays
  lapis: {
    name: "Lapis",
    layer: "Structure",
    tile: lowRes(inlaidStone(kLapis, kGold))
  },
  gold: {
    name: "Gold",
    layer: "Structure",
    tile: lowRes(metal(kGold)),
    group: "gold",
    variants: ["ramp", "rampCornerOuter", "slabBottom", "stair", "stairCornerOuter"]
  },
  faience: {
    name: "Faience",
    layer: "Structure",
    tile: lowRes(glazedTiles(kFaience)),
    variants: ["slabBottom"]
  },

  // Terrain
  rock: {
    name: "Rock",
    layer: "Terrain",
    tile: rock(kRock),
    alternates: 3
  },
  ochreRock: {
    name: "Ochre rock",
    layer: "Terrain",
    tile: rock(kOchreRock),
    alternates: 2
  },
  basalt: {
    name: "Basalt",
    layer: "Terrain",
    tile: rock(kBasalt),
    alternates: 2
  },
  sand: {
    name: "Sand",
    layer: "Terrain",
    tile: rippledSand(kDesertSand),
    alternates: 2,
    faces: { sides: granular(kDesertSand), bottom: granular(kDesertSand) }
  },
  dirt: {
    name: "Dirt",
    layer: "Terrain",
    tile: granular(kDirt),
    alternates: 2
  },

  // Garden
  grass: {
    name: "Grass",
    layer: "Garden",
    tile: grassTop(kGrass),
    alternates: 2,
    faces: { sides: grassSide(kGrass, kDirt), bottom: granular(kDirt) }
  },
  leaves: {
    name: "Leaves",
    layer: "Garden",
    tile: foliage(kLeaves),
    alternates: 2,
    cutout: true
  },
  acaciaLeaves: {
    name: "Acacia leaves",
    layer: "Garden",
    tile: foliage(kAcaciaLeaves),
    alternates: 2,
    cutout: true
  },
  trunk: {
    name: "Tree trunk",
    layer: "Garden",
    tile: bark(kBark),
    variants: ["poleY"]
  }
} as const satisfies Record<string, MaterialSpec<Layer>>;
