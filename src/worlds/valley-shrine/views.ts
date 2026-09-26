// Import Internal Dependencies
import type { CameraPose } from "../../core/world.ts";

export const VIEWS = {
  overview: { x: 0, y: 190, z: 330, yaw: 0, pitch: -0.42 },
  valley: { x: -10, y: 34, z: 94, yaw: 0, pitch: -0.1 },
  temple: { x: -10, y: 78, z: 22, yaw: 0, pitch: -0.45 },
  hall: { x: -40, y: 40, z: -10, yaw: -0.6, pitch: -0.2 },
  pagoda: { x: 84, y: 40, z: -18, yaw: 0.78, pitch: 0.08 },
  garden: { x: -24, y: 36, z: 70, yaw: -0.75, pitch: -0.32 },
  bridge: { x: 4, y: 26, z: 40, yaw: 0.785, pitch: -0.25 },
  drygarden: { x: 52, y: 40, z: 10, yaw: 0, pitch: -0.6 },
  shrine: { x: -24, y: 80, z: -78, yaw: 0.8, pitch: -0.3 },
  cascade: { x: 40, y: 45, z: 40, yaw: -1.06, pitch: -0.05 },
  overlook: { x: -10, y: 45, z: 205, yaw: 0, pitch: -0.12 },
  peaks: { x: -150, y: 210, z: -40, yaw: -1.2, pitch: -0.35 }
} as const satisfies Record<string, CameraPose>;
