export interface CameraPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/**
 * Starting camera poses, selected with `?view=`.
 */
export const VIEWS = {
  overview: { x: 70, y: 115, z: 235, yaw: 0, pitch: -0.4 },
  platform: { x: 18, y: 62, z: 72, yaw: -0.24, pitch: -0.62 },
  path: { x: 95, y: 42, z: 60, yaw: 0, pitch: -0.28 },
  arch: { x: 70, y: 30, z: 28, yaw: -0.75, pitch: -0.05 },
  pyramid: { x: 100, y: 62, z: 100, yaw: -0.66, pitch: -0.2 },
  interior: { x: 155, y: 27, z: 0, yaw: -1.5708, pitch: -0.05 },
  waterfall: { x: 262, y: 22, z: 70, yaw: 0.45, pitch: -0.3 },
  pad: { x: 24, y: 50, z: 76, yaw: 0, pitch: -0.35 }
} as const satisfies Record<string, CameraPose>;

export type ViewName = keyof typeof VIEWS;
