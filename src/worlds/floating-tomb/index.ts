// Import Internal Dependencies
import type { WorldDefinition } from "../../core/world.ts";
import { ATMOSPHERE } from "./atmosphere.ts";
import { BLOCKS } from "./blocks.ts";
import { COPY_SPACING, EXTENT, SITE } from "./site.ts";
import { VIEWS } from "./views.ts";
import { buildPath } from "./zones/path.ts";
import { buildPlatform } from "./zones/platform.ts";
import { buildPyramid } from "./zones/pyramid.ts";

const world: WorldDefinition = {
  id: "floating-tomb",
  title: "Floating Tomb",
  blocks: BLOCKS,
  zones: [
    { name: "Platform", origin: SITE.platform.origin, build: buildPlatform },
    { name: "Path", origin: SITE.path.origin, build: buildPath },
    { name: "Pyramid", origin: SITE.pyramid.origin, build: buildPyramid }
  ],
  extent: EXTENT,
  copySpacing: COPY_SPACING,
  views: VIEWS,
  defaultView: "overview",
  atmosphere: ATMOSPHERE
};

export default world;
