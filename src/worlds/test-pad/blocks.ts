// Import Internal Dependencies
import type { MaterialSpec } from "../../core/blocks/materials.ts";
import { defineBlocks } from "../../core/blocks/registry.ts";
import {
  inlaidStone,
  masonry,
  metal,
  speckledStone
} from "../../core/blocks/painters/stone.ts";
import { lowRes, Palette } from "../../core/blocks/painters/tile.ts";

// CONSTANTS
const kSandstone = new Palette("#8f7c52", "#b09c6c", "#cbb88a", "#dccc9f", "#e8dcb4", "#f4ecd0");
const kLimestone = new Palette("#8f8676", "#b9b09c", "#d8cfb8", "#e9e2cc", "#f4efe0", "#fffaf0");
const kGranite = new Palette("#1e2027", "#2b2e37", "#383c47", "#474c59", "#5c6273");
const kFlecks = new Palette("#15161a", "#9a968f");
const kLapis = new Palette("#0f2447", "#16336a", "#1f4589", "#2b58a6", "#3a6fc2");
const kGold = new Palette("#7a5410", "#a8761b", "#d09a2a", "#eebd45", "#fbd970", "#fff2b5");

const kLayers = ["Structure"] as const;

const kMaterials = {
  sandstone: {
    name: "Sandstone brick",
    layer: "Structure",
    tile: masonry(kSandstone, { course: 8, length: 16, stagger: 8 }),
    variants: [
      "stair", "stairCornerInner", "stairCornerOuter",
      "ramp", "rampCornerInner", "rampCornerOuter",
      "slabBottom", "slabTop", "pole", "poleY"
    ]
  },
  limestone: {
    name: "Limestone",
    layer: "Structure",
    tile: masonry(kLimestone, { course: 16, length: 16, stagger: 8 })
  },
  granite: {
    name: "Dark granite",
    layer: "Structure",
    tile: lowRes(speckledStone(kGranite, kFlecks))
  },
  lapis: {
    name: "Lapis",
    layer: "Structure",
    tile: lowRes(inlaidStone(kLapis, kGold))
  },
  gold: {
    name: "Gold",
    layer: "Structure",
    tile: lowRes(metal(kGold)),
    group: "gold"
  }
} as const satisfies Record<string, MaterialSpec<typeof kLayers[number]>>;

export const BLOCKS = defineBlocks(kMaterials, {
  tilesetId: "test-pad",
  layers: kLayers,
  finishes: { gold: { roughness: 0.38, metalness: 0.75 } }
});

export const { B } = BLOCKS;
