// Import Internal Dependencies
import { defineBlocks } from "../../core/blocks/registry.ts";
import type { IslandBlocks } from "../../core/builder/FloatingIsland.ts";
import { FINISHES, LAYERS, MATERIALS } from "./materials.ts";

export const BLOCKS = defineBlocks(MATERIALS, {
  tilesetId: "tomb",
  layers: LAYERS,
  finishes: FINISHES
});

export const { B } = BLOCKS;

export const ISLAND_BLOCKS: IslandBlocks = {
  grass: B.grass,
  dirt: B.dirt,
  sand: B.sand,
  rock: B.rock,
  deepRock: B.basalt,
  bandRock: B.ochreRock
};
