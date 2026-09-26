// Import Internal Dependencies
import type { Atmosphere } from "../../core/scene/atmosphere.ts";

export const ATMOSPHERE: Atmosphere = {
  sky: {
    horizon: "#f6d8c2",
    blue: "#9dc2e6",
    zenith: "#3d70b6",
    haze: "#c7d2e2"
  },
  /**
   * Golden afternoon sun from the south-west, high enough to clear the
   * ridges and light the valley floor.
   */
  sun: {
    direction: [-0.5, 0.75, 0.45],
    color: "#ffd6a0",
    intensity: 2.8
  },
  hemisphere: {
    sky: "#c2daf2",
    ground: "#6b8248",
    intensity: 1.1
  },
  fogDensity: 0.0009,
  exposure: 1.05,
  /**
   * A cloud sea around the rim, hiding the roots of the cliffs.
   */
  clouds: {
    count: 560,
    x: [-270, 270],
    y: [-18, 8],
    z: [-270, 270],
    drift: 0.4
  }
};
