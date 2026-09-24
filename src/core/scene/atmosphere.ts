// Import Third-party Dependencies
import * as THREE from "three/webgpu";

// Import Internal Dependencies
import type { Vec3 } from "../builder/Brush.ts";

export interface SkyColors {
  horizon: string;
  blue: string;
  zenith: string;
  haze: string;
}

export interface CloudOptions {
  count: number;
  x: readonly [min: number, max: number];
  y: readonly [min: number, max: number];
  z: readonly [min: number, max: number];
  drift: number;
}

export interface Atmosphere {
  sky: SkyColors;
  sun: {
    direction: Vec3;
    color: string;
    intensity: number;
  };
  hemisphere: {
    sky: string;
    ground: string;
    intensity: number;
  };
  fogDensity: number;
  exposure: number;
  clouds: CloudOptions | false;
}

export function sunDirection(
  atmosphere: Atmosphere
): THREE.Vector3 {
  return new THREE.Vector3(...atmosphere.sun.direction).normalize();
}
