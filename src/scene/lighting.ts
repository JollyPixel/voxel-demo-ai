// Import Third-party Dependencies
import * as THREE from "three/webgpu";

// Import Internal Dependencies
import type { PointLightFixture } from "../builder/fixtures.ts";
import type { Bounds } from "../site.ts";
import { SKY } from "./effects.ts";

// CONSTANTS
/**
 * Late-afternoon sun from the south-west, low enough to rake the terraces.
 */
export const SUN_DIRECTION = new THREE.Vector3(-0.62, 0.55, 0.56).normalize();
const kFogDensity = 0.0016;

export interface LightingOptions {
  shadows: boolean;
  lights: readonly PointLightFixture[];
  /**
   * The sun's shadow map is fitted to these bounds.
   */
  bounds: Bounds;
  /**
   * The voxel view, whose chunk meshes carry shadow flags of their own.
   */
  chunks: { castShadow: boolean; receiveShadow: boolean; };
}

export interface Lighting {
  readonly shadows: boolean;
  setShadows: (enabled: boolean) => void;
}

/**
 * Renderer and scene settings that must be in place before the first frame.
 */
export function configureRendering(
  renderer: THREE.WebGPURenderer,
  scene: THREE.Scene,
  options: { shadows: boolean; }
): void {
  renderer.shadowMap.enabled = options.shadows;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene.background = new THREE.Color(SKY.horizon);
  scene.fog = new THREE.FogExp2(SKY.haze, kFogDensity);
}

/**
 * A warm sun over a cool sky fill, plus the zones' point lights.
 */
export function createLighting(
  renderer: THREE.WebGPURenderer,
  scene: THREE.Scene,
  options: LightingOptions
): Lighting {
  const sun = createSun(options.bounds);
  scene.add(new THREE.HemisphereLight("#bcd6f2", "#8a7454", 1.15), sun, sun.target);
  for (const { position, color, intensity, distance } of options.lights) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(...position);
    scene.add(light);
  }

  function setShadows(enabled: boolean): void {
    sun.castShadow = enabled;
    renderer.shadowMap.enabled = enabled;
    options.chunks.castShadow = enabled;
    options.chunks.receiveShadow = enabled;
  }
  setShadows(options.shadows);

  return {
    get shadows() {
      return sun.castShadow;
    },
    setShadows
  };
}

/**
 * One shadow map, its orthographic frustum wrapped around the scene's
 * bounding sphere as seen from the sun.
 */
function createSun(
  { min, max }: Bounds
): THREE.DirectionalLight {
  const centre = new THREE.Vector3(...min).add(new THREE.Vector3(...max)).multiplyScalar(0.5);
  const radius = new THREE.Vector3(...max).sub(new THREE.Vector3(...min)).length() / 2;

  const sun = new THREE.DirectionalLight("#ffd9a3", 2.7);
  sun.target.position.copy(centre);
  sun.position.copy(centre).addScaledVector(SUN_DIRECTION, radius * 2);

  const { shadow } = sun;
  shadow.mapSize.set(4096, 4096);
  shadow.bias = -0.0002;
  shadow.normalBias = 0.02;
  shadow.camera.left = -radius;
  shadow.camera.right = radius;
  shadow.camera.top = radius;
  shadow.camera.bottom = -radius;
  shadow.camera.near = radius * 0.5;
  shadow.camera.far = radius * 3.5;

  return sun;
}
