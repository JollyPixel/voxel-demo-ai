// Import Internal Dependencies
import type { MaterialSpec, SurfaceFinish } from "../../core/blocks/materials.ts";
import {
  bark,
  flowers,
  foliage,
  granular,
  grassSide,
  grassTop,
  rippledSand
} from "../../core/blocks/painters/ground.ts";
import { roofTiles } from "../../core/blocks/painters/roof.ts";
import {
  flagstones,
  masonry,
  metal,
  rock,
  speckledStone
} from "../../core/blocks/painters/stone.ts";
import { lowRes, Palette } from "../../core/blocks/painters/tile.ts";
import {
  bamboo,
  lacquer,
  paperLantern,
  planks,
  plaster,
  shoji
} from "../../core/blocks/painters/wood.ts";

export const FINISHES = {
  gold: { roughness: 0.38, metalness: 0.75 },
  lacquer: { roughness: 0.55, metalness: 0 },
  glow: { roughness: 0.9, metalness: 0, emissive: "#ff9d4a", emissiveIntensity: 0.55 }
} as const satisfies Record<string, SurfaceFinish>;

// CONSTANTS
const kGrass = new Palette("#3d7a22", "#4a8e28", "#58a22e", "#68b536", "#7bc540", "#91d34d", "#a9df5e");
const kMoss = new Palette("#29502a", "#33622f", "#3f7534", "#4c883a", "#5c9b42", "#70ad4c");
const kDirt = new Palette("#4a3322", "#5b3f2a", "#6c4b32", "#7d583b", "#8e6645", "#9f7450");
const kRock = new Palette("#3c3f46", "#4c5058", "#5d616a", "#70747c", "#858990", "#9b9ea4");
const kPaleRock = new Palette("#4a4d53", "#5b5e65", "#6d7077", "#81848a", "#96989d", "#abadb1");
const kDarkRock = new Palette("#25272d", "#30333a", "#3c3f47", "#494d56", "#575b64");
const kSnow = new Palette("#aab6c6", "#c0cad8", "#d3dbe6", "#e3e9f0", "#f1f4f8", "#fbfcfd");
const kPebbles = new Palette("#4f4a44", "#645e56", "#7a7369", "#90887d", "#a69e92", "#bcb4a8");
const kPathEarth = new Palette("#8a5d34", "#9f6c3d", "#b37c47", "#c48d54", "#d29f65", "#deb179");
const kGravel = new Palette("#8f8d88", "#a3a19b", "#b6b4ae", "#c8c6c0", "#d9d7d1", "#e8e6e1");
const kGranite = new Palette("#4f4f4d", "#62625f", "#767672", "#8a8a85", "#9e9e98", "#b3b3ac");
const kFlecks = new Palette("#2a2a2a", "#c8c6bd");
const kPaving = new Palette("#5f5d58", "#77746d", "#8e8b83", "#a4a198", "#b9b6ac");

const kVermilion = new Palette("#5e130f", "#7a1a13", "#971f16", "#b1291b", "#c83823", "#dc5030");
const kCedar = new Palette("#5a3218", "#6f3f1e", "#874e25", "#9e5e2e", "#b47038", "#c98546");
const kDarkWood = new Palette("#1f140e", "#2b1b12", "#382318", "#472d1f", "#563727");
const kPlaster = new Palette("#b9b2a2", "#cfc9bb", "#e0dbcf", "#ece8de", "#f5f2ea", "#fcfaf5");
const kPaper = new Palette("#cfc3a2", "#e2d8bb", "#efe7cf", "#f8f2e0", "#fffbee");
const kRoofTile = new Palette("#23272e", "#2f343d", "#3c424c", "#4a515d", "#5a626f", "#6d7684");
const kCopper = new Palette("#15504a", "#1c665d", "#247c70", "#2f9282", "#42a894", "#62bfa8");
const kGold = new Palette("#7a5410", "#a8761b", "#d09a2a", "#eebd45", "#fbd970", "#fff2b5");
const kLantern = new Palette("#a8401c", "#c95a26", "#e07a33", "#f09c48", "#f9bf68", "#ffdf96");

const kBlossom = new Palette("#a64f78", "#c56892", "#dc84aa", "#eb9fbe", "#f5bad1", "#fcd5e3");
const kPaleBlossom = new Palette("#c68fa8", "#dcaac0", "#ecc3d4", "#f6d9e4", "#fcebf1", "#fff8fa");
const kLeaves = new Palette("#1f4a1a", "#2a5f21", "#37752a", "#468c33", "#5aa43f", "#74bb4e");
const kPine = new Palette("#15301f", "#1c3e28", "#244d31", "#2d5d3a", "#386e45", "#458052");
const kMaple = new Palette("#5e1210", "#7e1a14", "#a02618", "#bf391d", "#d85224", "#ea722f");
const kAzalea = new Palette("#6d1a4c", "#8a2462", "#a73279", "#c2468f", "#d862a6", "#ea85bd");
const kBamboo = new Palette("#3a6420", "#4a7d27", "#5c9530", "#72ac3b", "#8bc14a", "#a6d35e");
const kBambooLeaves = new Palette("#3b6a24", "#4b812b", "#5d9833", "#72ae3e", "#8ac34b", "#a2d45b");
const kCherryBark = new Palette("#24160f", "#321f16", "#42291e", "#523427", "#624031");
const kPineBark = new Palette("#33251c", "#443226", "#564031", "#684e3c", "#7a5d48");
const kPetals = [kBlossom, kPaleBlossom];
const kWildflowers = [kBlossom, kPaleBlossom, new Palette("#c9a227", "#e4c040", "#f6dc68")];

/**
 * Every material in the scene. Declaration order is the tile order in the
 * generated atlas.
 */
export const MATERIALS = {
  // Terrain
  grass: {
    name: "Grass",
    tile: grassTop(kGrass),
    alternates: 2,
    faces: { sides: grassSide(kGrass, kDirt), bottom: granular(kDirt) }
  },
  meadow: {
    name: "Flowering grass",
    tile: flowers(grassTop(kGrass), kWildflowers),
    alternates: 2,
    faces: { sides: grassSide(kGrass, kDirt), bottom: granular(kDirt) }
  },
  petals: {
    name: "Petal-strewn grass",
    tile: flowers(grassTop(kGrass), kPetals, 26),
    alternates: 2,
    faces: { sides: grassSide(kGrass, kDirt), bottom: granular(kDirt) }
  },
  moss: {
    name: "Moss",
    tile: grassTop(kMoss),
    faces: { sides: grassSide(kMoss, kDirt), bottom: granular(kDirt) }
  },
  dirt: {
    name: "Dirt",
    tile: granular(kDirt),
    alternates: 2
  },
  rock: {
    name: "Granite",
    tile: rock(kRock),
    alternates: 3
  },
  paleRock: {
    name: "Pale granite",
    tile: rock(kPaleRock),
    alternates: 2
  },
  darkRock: {
    name: "Dark granite",
    tile: rock(kDarkRock),
    alternates: 2
  },
  mossRock: {
    name: "Mossy granite",
    tile: rock(kRock),
    faces: { top: grassTop(kMoss) }
  },
  snow: {
    name: "Snow",
    tile: granular(kSnow),
    faces: { sides: rock(kPaleRock), bottom: rock(kPaleRock) }
  },
  pebbles: {
    name: "River pebbles",
    tile: granular(kPebbles),
    alternates: 2
  },
  path: {
    name: "Packed earth",
    tile: granular(kPathEarth),
    alternates: 2
  },
  gravel: {
    name: "Raked gravel",
    tile: rippledSand(kGravel),
    faces: { sides: granular(kGravel), bottom: granular(kGravel) }
  },

  // Stone
  stone: {
    name: "Dressed granite",
    tile: lowRes(masonry(kGranite, { course: 8, length: 16, stagger: 8, variation: 0.5 })),
    alternates: 2,
    variants: ["stair", "stairCornerOuter", "slabBottom", "slabTop"]
  },
  paving: {
    name: "Paving stone",
    tile: lowRes(flagstones(kPaving)),
    alternates: 2,
    variants: ["slabBottom"]
  },
  lanternStone: {
    name: "Lantern stone",
    tile: lowRes(speckledStone(kGranite, kFlecks)),
    variants: [
      "slabBottom", "slabTop", "poleY",
      "ramp", "rampCornerOuter", "stair", "stairCornerOuter"
    ]
  },

  // Timber
  vermilion: {
    name: "Vermilion lacquer",
    tile: lacquer(kVermilion),
    group: "lacquer",
    variants: ["poleY", "pole", "slabBottom", "slabTop", "stair", "stairCornerOuter"]
  },
  cedar: {
    name: "Cedar planks",
    tile: planks(kCedar),
    alternates: 2,
    variants: ["poleY", "pole", "slabBottom", "slabTop", "stair", "stairCornerOuter"]
  },
  cedarPost: {
    name: "Cedar post",
    tile: planks(kCedar, { board: 16, vertical: true })
  },
  darkWood: {
    name: "Dark timber",
    tile: planks(kDarkWood, { board: 16 }),
    variants: ["poleY", "pole", "slabBottom", "slabTop", "stair", "stairCornerOuter"]
  },
  plaster: {
    name: "Lime plaster",
    tile: plaster(kPlaster),
    variants: ["slabBottom"]
  },
  shoji: {
    name: "Shoji screen",
    tile: lowRes(shoji(kDarkWood, kPaper))
  },
  lantern: {
    name: "Paper lantern",
    tile: lowRes(paperLantern(kLantern, kDarkWood)),
    group: "glow"
  },
  gold: {
    name: "Gold",
    tile: lowRes(metal(kGold)),
    group: "gold",
    variants: ["slabBottom", "slabTop", "poleY", "stair", "stairCornerOuter"]
  },

  // Roofs
  roofTile: {
    name: "Roof tile",
    tile: lowRes(roofTiles(kRoofTile)),
    variants: [
      "ramp", "rampCornerOuter", "rampCornerInner",
      "stair", "stairCornerOuter", "stairCornerInner",
      "slabBottom", "slabTop"
    ]
  },
  copperRoof: {
    name: "Copper roof",
    tile: lowRes(roofTiles(kCopper)),
    variants: [
      "ramp", "rampCornerOuter", "rampCornerInner",
      "stair", "stairCornerOuter", "stairCornerInner",
      "slabBottom", "slabTop"
    ]
  },

  // Garden
  blossom: {
    name: "Cherry blossom",
    tile: foliage(kBlossom),
    alternates: 2,
    cutout: true
  },
  paleBlossom: {
    name: "Pale cherry blossom",
    tile: foliage(kPaleBlossom),
    alternates: 2,
    cutout: true
  },
  leaves: {
    name: "Leaves",
    tile: foliage(kLeaves),
    alternates: 2,
    cutout: true
  },
  pine: {
    name: "Pine needles",
    tile: foliage(kPine),
    alternates: 2,
    cutout: true
  },
  maple: {
    name: "Maple leaves",
    tile: foliage(kMaple),
    alternates: 2,
    cutout: true
  },
  azalea: {
    name: "Azalea",
    tile: foliage(kAzalea),
    cutout: true
  },
  bamboo: {
    name: "Bamboo",
    tile: bamboo(kBamboo),
    variants: ["poleY"]
  },
  bambooLeaves: {
    name: "Bamboo leaves",
    tile: foliage(kBambooLeaves),
    cutout: true
  },
  cherryBark: {
    name: "Cherry bark",
    tile: bark(kCherryBark),
    variants: ["poleY"]
  },
  pineBark: {
    name: "Pine bark",
    tile: bark(kPineBark),
    variants: ["poleY"]
  }
} as const satisfies Record<string, MaterialSpec>;
