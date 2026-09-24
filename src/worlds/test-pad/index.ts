// Import Internal Dependencies
import type { WorldDefinition } from "../../core/world.ts";
import { BLOCKS } from "./blocks.ts";
import { buildTestPad } from "./pad.ts";

const world: WorldDefinition = {
  id: "test-pad",
  title: "Test pad",
  blocks: BLOCKS,
  zones: [
    { name: "Pad", origin: [0, 0, 0], build: buildTestPad }
  ],
  extent: { min: [-4, 16, -4], max: [51, 26, 41] },
  copySpacing: { x: 60, z: 50 },
  views: {
    pad: { x: 24, y: 50, z: 76, yaw: 0, pitch: -0.35 }
  },
  defaultView: "pad",
  atmosphere: {
    sky: {
      horizon: "#f4dcc0",
      blue: "#8db4dc",
      zenith: "#3a6aad",
      haze: "#bfcadb"
    },
    sun: { direction: [-0.62, 0.55, 0.56], color: "#ffd9a3", intensity: 2.7 },
    hemisphere: { sky: "#bcd6f2", ground: "#8a7454", intensity: 1.15 },
    fogDensity: 0.0016,
    exposure: 1.05,
    clouds: false
  }
};

export default world;
