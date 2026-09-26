// Import Internal Dependencies
import { defineBlocks } from "../../core/blocks/registry.ts";
import { FINISHES, MATERIALS } from "./materials.ts";

export const BLOCKS = defineBlocks(MATERIALS, {
  tilesetId: "shrine",
  finishes: FINISHES
});

export const { B } = BLOCKS;
