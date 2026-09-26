// Import Internal Dependencies
import type { WorldDefinition } from "../../core/world.ts";
import { ATMOSPHERE } from "./atmosphere.ts";
import { BLOCKS } from "./blocks.ts";
import { COPY_SPACING, EXTENT } from "./site.ts";
import { VIEWS } from "./views.ts";
import { buildApproach } from "./zones/approach.ts";
import { buildForest } from "./zones/forest.ts";
import { buildGarden } from "./zones/garden.ts";
import { buildLand } from "./zones/land.ts";
import { buildPagoda } from "./zones/pagoda.ts";
import { buildShrine } from "./zones/shrine.ts";
import { buildTemple } from "./zones/temple.ts";

const kOrigin = [0, 0, 0] as const;

const world: WorldDefinition = {
  id: "valley-shrine",
  title: "Valley Shrine",
  blocks: BLOCKS,
  zones: [
    { name: "Land", origin: kOrigin, build: buildLand },
    { name: "Temple", origin: kOrigin, build: buildTemple },
    { name: "Pagoda", origin: kOrigin, build: buildPagoda },
    { name: "Garden", origin: kOrigin, build: buildGarden },
    { name: "Approach", origin: kOrigin, build: buildApproach },
    { name: "Shrine", origin: kOrigin, build: buildShrine },
    { name: "Forest", origin: kOrigin, build: buildForest }
  ],
  extent: EXTENT,
  copySpacing: COPY_SPACING,
  views: VIEWS,
  defaultView: "overview",
  atmosphere: ATMOSPHERE
};

export default world;
