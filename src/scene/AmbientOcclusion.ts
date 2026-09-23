// Import Third-party Dependencies
import type { Systems } from "@jolly-pixel/engine";
import * as THREE from "three/webgpu";
import {
  builtinAOContext,
  mrt,
  normalView,
  pass,
  screenUV
} from "three/tsl";
import { ao } from "three/addons/tsl/display/GTAONode.js";

// CONSTANTS
const kResolutionScale = 0.5;
const kRadius = 1.4;

/**
 * Renders the scene through a GTAO pipeline: a normal and depth pre-pass
 * feeds ambient occlusion, which darkens only the indirect light of the main
 * pass. Voxel creases, stair treads and room corners gain the contact shading
 * the voxel mesher does not bake (F-08).
 *
 * Installed on the engine's `ThreeRenderer` in place of its direct strategy,
 * which it falls back to for split-screen viewports.
 */
export class AmbientOcclusionStrategy implements Systems.RenderStrategy {
  readonly #renderer: THREE.WebGPURenderer;
  readonly #fallback: Systems.RenderStrategy;
  #pipeline: THREE.RenderPipeline | null = null;
  #camera: THREE.Camera | null = null;

  constructor(
    renderer: THREE.WebGPURenderer,
    fallback: Systems.RenderStrategy
  ) {
    this.#renderer = renderer;
    this.#fallback = fallback;
  }

  render(
    scene: THREE.Scene,
    parameters: Systems.RenderParameters
  ): void {
    const { components, canvasWidth, canvasHeight } = parameters;
    const [component] = components;
    if (components.length !== 1 || component.viewport !== null) {
      this.#fallback.render(scene, parameters);

      return;
    }

    component.prepareRender(canvasWidth, canvasHeight);
    this.#pipelineFor(scene, component.threeCamera).render();
  }

  resize(
    width: number,
    height: number
  ): void {
    this.#fallback.resize(width, height);
  }

  dispose(): void {
    this.#pipeline?.dispose();
    this.#pipeline = null;
  }

  #pipelineFor(
    scene: THREE.Scene,
    camera: THREE.Camera
  ): THREE.RenderPipeline {
    if (this.#pipeline && this.#camera === camera) {
      return this.#pipeline;
    }
    this.dispose();

    // GTAO samples depth with textureGather, which rejects multisampled textures.
    const prePass = pass(scene, camera, { samples: 0 });
    prePass.setMRT(mrt({ output: normalView }));
    const occlusion = ao(prePass.getTextureNode("depth"), prePass.getTextureNode(), camera);
    occlusion.resolutionScale = kResolutionScale;
    occlusion.radius.value = kRadius;

    const scenePass = pass(scene, camera);
    scenePass.contextNode = builtinAOContext(occlusion.getTextureNode().sample(screenUV).r);

    this.#pipeline = new THREE.RenderPipeline(this.#renderer, scenePass);
    this.#camera = camera;

    return this.#pipeline;
  }
}

export interface AmbientOcclusion {
  readonly enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/**
 * Swaps the renderer's strategy between the occlusion pipeline and the
 * engine's own direct strategy.
 */
export function installAmbientOcclusion(
  target: Systems.ThreeRenderer,
  enabled: boolean
): AmbientOcclusion {
  const direct = target.renderStrategy;
  const occluded = new AmbientOcclusionStrategy(target.getSource(), direct);

  function setEnabled(value: boolean): void {
    target.renderStrategy = value ? occluded : direct;
  }
  setEnabled(enabled);

  return {
    get enabled() {
      return target.renderStrategy === occluded;
    },
    setEnabled
  };
}
