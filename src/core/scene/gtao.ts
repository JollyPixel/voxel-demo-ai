// Import Third-party Dependencies
import type { CameraComponent, Systems } from "@jolly-pixel/engine";
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
 * A normal and depth pre-pass feeds GTAO, which darkens only the indirect
 * light of the main pass. The mesher's baked occlusion is the default;
 * this optional pass (`?gtao=1`) keeps `camera.postProcessing` exercised
 * by the demo.
 */
export function gtao({ scene, camera }: Systems.PostProcessingContext) {
  // GTAO samples depth with textureGather, which rejects multisampled textures.
  const prePass = pass(scene, camera, { samples: 0 });
  prePass.setMRT(mrt({ output: normalView }));
  const occlusion = ao(prePass.getTextureNode("depth"), prePass.getTextureNode(), camera);
  occlusion.resolutionScale = kResolutionScale;
  occlusion.radius.value = kRadius;

  const scenePass = pass(scene, camera);
  scenePass.contextNode = builtinAOContext(occlusion.getTextureNode().sample(screenUV).r);

  return scenePass;
}

export interface Gtao {
  readonly enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export function installGtao(
  camera: CameraComponent,
  enabled: boolean
): Gtao {
  function setEnabled(value: boolean): void {
    camera.postProcessing = value ? gtao : null;
  }
  setEnabled(enabled);

  return {
    get enabled() {
      return camera.postProcessing === gtao;
    },
    setEnabled
  };
}
