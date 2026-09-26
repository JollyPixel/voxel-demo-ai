// Import Internal Dependencies
import type { Vec3 } from "./Brush.ts";

/**
 * Scene elements placed by the zones but rendered outside the voxel engine.
 * All positions are in world coordinates.
 */
export interface Fixtures {
  pools: PoolFixture[];
  waterfalls: WaterfallFixture[];
  lights: PointLightFixture[];
}

export interface PoolFixture {
  center: Vec3;
  width: number;
  depth: number;
}

export interface WaterfallFixture {
  center: Vec3;
  width: number;
  height: number;
  /**
   * Horizontal axis the sheet spans; it faces along the other one.
   */
  axis: "x" | "z";
}

export interface PointLightFixture {
  position: Vec3;
  color: string;
  intensity: number;
  distance: number;
}
