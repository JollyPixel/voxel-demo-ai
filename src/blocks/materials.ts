// Import Third-party Dependencies
import type { BlockShapeID } from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import {
  bark,
  foliage,
  granular,
  grassSide,
  grassTop,
  palmBark,
  rippledSand,
  tilledSoil
} from "./painters/ground.ts";
import {
  flowers,
  frond,
  hangingRoots,
  papyrus,
  tuft
} from "./painters/plants.ts";
import {
  carved,
  flagstones,
  frieze,
  glazedTiles,
  inlaidStone,
  masonry,
  metal,
  rock,
  speckledStone
} from "./painters/stone.ts";
import { Palette, type TilePainter } from "./painters/tile.ts";

/**
 * World layers, from lowest to highest compositing priority: when two layers
 * hold a voxel in the same cell, the later one is drawn.
 */
export const LAYERS = ["Terrain", "Structure", "Garden", "Detail"] as const;
export type Layer = typeof LAYERS[number];

/**
 * Texture slots of the engine's built-in shapes (see `shapeSlots.ts`), plus
 * `sides` for the four vertical faces at once.
 */
export type FaceSlot = "right" | "left" | "top" | "bottom" | "front" | "back" | "sides";

export interface MaterialSpec {
  name: string;
  layer: Layer;
  tile: TilePainter;
  /**
   * Tiles painted from the same painter with different seeds. The brush picks
   * one per voxel from its position, which breaks up visible repetition.
   * @default 1
   */
  alternates?: number;
  /**
   * Tiles for particular faces, e.g. the soil sides of a grass block.
   */
  faces?: Partial<Record<FaceSlot, TilePainter>>;
  /**
   * @default "cube"
   */
  shape?: BlockShapeID;
  /**
   * Extra shaped blocks sharing this material's first tile, reachable as
   * `B.<material>.<shape>`.
   */
  variants?: readonly BlockShapeID[];
  /**
   * Alpha-masked plant or foliage: rendered double-sided, never collidable.
   */
  cutout?: boolean;
}

// CONSTANTS
const kSandstone = new Palette("#6e5231", "#9a7646", "#bf9a60", "#d8b87c", "#e9cf98", "#f5e3b7");
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
const kGrass = new Palette("#2f5a24", "#3d7229", "#4d8a31", "#61a23b", "#7dba4a", "#9dd060");
const kDirt = new Palette("#4a3020", "#5e3e28", "#744e33", "#8a603f", "#a0754f");
const kSoil = new Palette("#2b1c13", "#3a271a", "#4a3322", "#5b412c");
const kDesertSand = new Palette("#b8945c", "#caa76c", "#dbba7e", "#e8cb92", "#f2dcab");
const kRock = new Palette("#4a403a", "#5e524a", "#74665b", "#8a7a6c", "#a0907f");
const kOchreRock = new Palette("#6b4a2c", "#86603a", "#a0784a", "#b88f5b", "#cda66f");
const kBasalt = new Palette("#2d2a30", "#3a363d", "#48434b", "#57515a", "#686169");
const kLeaves = new Palette("#1f4a1f", "#2a5f26", "#37752e", "#468c37", "#5aa443");
const kPalmBark = new Palette("#4f3a24", "#66492c", "#7e5c38", "#977045", "#ad8555");
const kBark = new Palette("#3b2818", "#4f3620", "#644429", "#7a5433");
const kTuft = new Palette("#3a6e2a", "#4d8a33", "#64a33f", "#86c052");

/**
 * Every material in the scene. Declaration order is the tile order in the
 * generated atlas.
 */
export const MATERIALS = {
  // Masonry
  sandstone: {
    name: "Sandstone brick",
    layer: "Structure",
    tile: masonry(kSandstone, { course: 4, length: 8, stagger: 4 }),
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
    tile: masonry(kSandstone, { course: 8, length: 16, stagger: 8 }),
    alternates: 2,
    variants: ["stair", "stairCornerOuter", "slabBottom", "slabTop", "poleY"]
  },
  carved: {
    name: "Carved sandstone",
    layer: "Structure",
    tile: carved(kSandstone)
  },
  limestone: {
    name: "Limestone",
    layer: "Structure",
    tile: masonry(kLimestone, { course: 8, length: 8, stagger: 4 }),
    alternates: 2,
    variants: ["stair", "stairCornerOuter", "slabBottom", "slabTop", "poleY"]
  },
  trim: {
    name: "Umber frieze",
    layer: "Structure",
    tile: frieze(kUmber, kOchre),
    variants: ["stair", "stairCornerOuter", "slabTop"]
  },
  flagstone: {
    name: "Flagstone",
    layer: "Structure",
    tile: flagstones(kPaving),
    alternates: 2,
    variants: ["slabBottom"]
  },
  granite: {
    name: "Dark granite",
    layer: "Structure",
    tile: speckledStone(kGranite, kFlecks),
    variants: ["slabBottom", "ramp"]
  },
  tombGranite: {
    name: "Tomb granite",
    layer: "Structure",
    tile: speckledStone(kGreyGranite, kFlecks),
    variants: ["slabBottom", "ramp", "poleY"]
  },

  // Inlays
  lapis: {
    name: "Lapis",
    layer: "Structure",
    tile: inlaidStone(kLapis, kGold)
  },
  gold: {
    name: "Gold",
    layer: "Structure",
    tile: metal(kGold),
    variants: ["ramp", "rampCornerOuter", "slabBottom", "stair", "stairCornerOuter"]
  },
  faience: {
    name: "Faience",
    layer: "Structure",
    tile: glazedTiles(kFaience),
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
    alternates: 3,
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
    alternates: 3,
    faces: { sides: grassSide(kGrass, kDirt), bottom: granular(kDirt) }
  },
  soil: {
    name: "Soil",
    layer: "Garden",
    tile: tilledSoil(kSoil)
  },
  leaves: {
    name: "Leaves",
    layer: "Garden",
    tile: foliage(kLeaves),
    alternates: 2,
    cutout: true
  },
  palmTrunk: {
    name: "Palm trunk",
    layer: "Garden",
    tile: palmBark(kPalmBark),
    variants: ["poleY"]
  },
  trunk: {
    name: "Tree trunk",
    layer: "Garden",
    tile: bark(kBark)
  },

  // Plants
  roseFlower: {
    name: "Rose flowers",
    layer: "Detail",
    tile: flowers(new Palette("#8f2f4a", "#c9486a", "#ec7f9b")),
    shape: "cross",
    cutout: true
  },
  lilacFlower: {
    name: "Lilac flowers",
    layer: "Detail",
    tile: flowers(new Palette("#7658b0", "#a585e0", "#d2bdf5")),
    shape: "cross",
    cutout: true
  },
  sunFlower: {
    name: "Marigolds",
    layer: "Detail",
    tile: flowers(new Palette("#b35a14", "#e88a1e", "#ffc14a")),
    shape: "cross",
    cutout: true
  },
  papyrus: {
    name: "Papyrus",
    layer: "Detail",
    tile: papyrus(),
    shape: "cross",
    cutout: true
  },
  frond: {
    name: "Frond",
    layer: "Detail",
    tile: frond(),
    shape: "cross",
    cutout: true
  },
  tuft: {
    name: "Grass tuft",
    layer: "Detail",
    tile: tuft(kTuft),
    shape: "cross",
    cutout: true
  },
  roots: {
    name: "Hanging roots",
    layer: "Detail",
    tile: hangingRoots(),
    shape: "cross",
    cutout: true
  }
} as const satisfies Record<string, MaterialSpec>;

export type MaterialKey = keyof typeof MATERIALS;
