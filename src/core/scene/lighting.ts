// Import Third-party Dependencies
import * as THREE from "three/webgpu";

// Import Internal Dependencies
import type { PointLightFixture } from "../builder/fixtures.ts";
import type { Bounds } from "../world.ts";
import { sunDirection, type Atmosphere } from "./atmosphere.ts";

export interface LightingOptions {
  shadows: boolean;
  atmosphere: Atmosphere;
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
  options: { shadows: boolean; atmosphere: Atmosphere; }
): void {
  const { sky, exposure, fogDensity } = options.atmosphere;
  renderer.shadowMap.enabled = options.shadows;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;

  scene.background = new THREE.Color(sky.horizon);
  scene.fog = new THREE.FogExp2(sky.haze, fogDensity);
}

/**
 * The sun over a sky fill, plus the zones' point lights.
 */
export function createLighting(
  renderer: THREE.WebGPURenderer,
  scene: THREE.Scene,
  options: LightingOptions
): Lighting {
  const { hemisphere } = options.atmosphere;
  const sun = createSun(options.bounds, options.atmosphere);
  scene.add(new THREE.HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity), sun, sun.target);
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
  { min, max }: Bounds,
  atmosphere: Atmosphere
): THREE.DirectionalLight {
  const centre = new THREE.Vector3(...min).add(new THREE.Vector3(...max)).multiplyScalar(0.5);
  const radius = new THREE.Vector3(...max).sub(new THREE.Vector3(...min)).length() / 2;

  const sun = new THREE.DirectionalLight(atmosphere.sun.color, atmosphere.sun.intensity);
  sun.target.position.copy(centre);
  sun.position.copy(centre).addScaledVector(sunDirection(atmosphere), radius * 2);

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
