// Import Internal Dependencies
import type { CameraPose } from "../../core/world.ts";

export const VIEWS = {
  overview: { x: 150, y: 115, z: 250, yaw: 0, pitch: -0.4 },
  platform: { x: 18, y: 62, z: 72, yaw: -0.24, pitch: -0.62 },
  garden: { x: 30, y: 27, z: 33, yaw: 0.63, pitch: -0.34 },
  tree: { x: -52, y: 34, z: 12, yaw: -0.75, pitch: 0 },
  path: { x: 120, y: 30, z: 95, yaw: 0, pitch: -0.12 },
  arch: { x: 80, y: 30, z: 34, yaw: -0.75, pitch: 0.05 },
  rotunda: { x: 96, y: 34, z: 22, yaw: -0.83, pitch: -0.38 },
  pyramid: { x: 150, y: 95, z: 160, yaw: -0.62, pitch: -0.26 },
  interior: { x: 218, y: 30, z: 0, yaw: -1.5708, pitch: -0.05 },
  waterfall: { x: 362, y: 22, z: 90, yaw: 0.45, pitch: -0.3 }
} as const satisfies Record<string, CameraPose>;
