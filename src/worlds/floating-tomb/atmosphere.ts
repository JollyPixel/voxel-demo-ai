// Import Internal Dependencies
import type { Atmosphere } from "../../core/scene/atmosphere.ts";

export const ATMOSPHERE: Atmosphere = {
  sky: {
    horizon: "#f4dcc0",
    blue: "#8db4dc",
    zenith: "#3a6aad",
    haze: "#bfcadb"
  },
  /**
   * Late-afternoon sun from the south-west, low enough to rake the terraces.
   */
  sun: {
    direction: [-0.62, 0.55, 0.56],
    color: "#ffd9a3",
    intensity: 2.7
  },
  hemisphere: {
    sky: "#bcd6f2",
    ground: "#8a7454",
    intensity: 1.15
  },
  fogDensity: 0.0016,
  exposure: 1.05,
  clouds: {
    count: 150,
    x: [-250, 550],
    y: [-48, -18],
    z: [-260, 300],
    drift: 0.4
  }
};
