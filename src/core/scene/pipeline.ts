// Import Third-party Dependencies
import type { CameraComponent, Systems } from "@jolly-pixel/engine";
import { voxelTransparencyPass } from "@jolly-pixel/voxel.renderer";
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

export interface PipelineOptions {
  /**
   * Screen-space ambient occlusion on the indirect light of the scene pass.
   */
  gtao: boolean;
  /**
   * Weighted blended transparency: the water composites without sorting.
   */
  oit: boolean;
}

export interface ScenePipeline extends Readonly<PipelineOptions> {
  set: (options: Partial<PipelineOptions>) => void;
}

/**
 * Drives the camera's `postProcessing` from the two optional passes. Both
 * off leaves the camera on the default render, which costs nothing extra.
 * The baked mesher occlusion is the default; GTAO (`?gtao=1`) and the
 * transparency pass (`?oit=1`) keep `camera.postProcessing` exercised.
 */
export function createScenePipeline(
  camera: CameraComponent,
  initial: PipelineOptions
): ScenePipeline {
  const options = { ...initial };
  camera.postProcessing = buildPipeline(options);

  return {
    get gtao() {
      return options.gtao;
    },
    get oit() {
      return options.oit;
    },
    set(changes) {
      Object.assign(options, changes);
      camera.postProcessing = buildPipeline(options);
    }
  };
}

function buildPipeline(
  { gtao, oit }: PipelineOptions
): Systems.PostProcessing | null {
  if (!gtao && !oit) {
    return null;
  }

  return ({ scene, camera }) => {
    const scenePass = oit ? voxelTransparencyPass(scene, camera) : pass(scene, camera);
    if (gtao) {
      // The transparency pass applies the context to its opaque draw only.
      scenePass.contextNode = builtinAOContext(occlusion(scene, camera).sample(screenUV).r);
    }

    return scenePass;
  };
}

/**
 * A normal and depth pre-pass feeds GTAO, which darkens only the indirect
 * light of the scene pass.
 */
function occlusion(
  scene: Systems.PostProcessingContext["scene"],
  camera: Systems.PostProcessingContext["camera"]
) {
  // GTAO samples depth with textureGather, which rejects multisampled textures.
  const prePass = pass(scene, camera, { samples: 0 });
  prePass.setMRT(mrt({ output: normalView }));
  const node = ao(prePass.getTextureNode("depth"), prePass.getTextureNode(), camera);
  node.resolutionScale = kResolutionScale;
  node.radius.value = kRadius;

  return node.getTextureNode();
}
