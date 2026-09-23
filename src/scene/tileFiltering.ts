// Import Third-party Dependencies
import type { BlockSurface } from "@jolly-pixel/voxel.renderer";
import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  dFdx,
  dFdy,
  float,
  floor,
  fract,
  reference,
  texture,
  uv,
  vec2,
  vec4
} from "three/tsl";

// Import Internal Dependencies
import type { PaddedAtlas } from "../blocks/index.ts";

/**
 * Mipmapped sampling for greedy-meshed voxels, so distant blocks fade to
 * their average colour instead of sparkling.
 *
 * The engine samples its atlas at mip level 0 only: its tile-wrapped UV
 * jumps at every repeat, and the atlas has no padding for mips to stay
 * inside a tile (F-09). The mesh's own `uv`, though, counts tile repeats
 * continuously across a merged quad, so its screen derivatives are smooth.
 * This node keeps the engine's geometry and swaps the lookup: it finds the
 * tile's cell from the `tileRegion` attribute, wraps the position inside
 * the tile, and samples a padded, mipmapped copy of the atlas with gradients
 * taken from the continuous UV.
 */
export class TileFiltering {
  readonly #atlas: THREE.CanvasTexture;
  readonly #layout: PaddedAtlas;

  constructor(
    layout: PaddedAtlas
  ) {
    this.#layout = layout;
    this.#atlas = new THREE.CanvasTexture(layout.canvas);
    this.#atlas.colorSpace = THREE.SRGBColorSpace;
    this.#atlas.magFilter = THREE.NearestFilter;
    this.#atlas.minFilter = THREE.LinearMipmapLinearFilter;
    this.#atlas.generateMipmaps = true;
  }

  /**
   * Replaces the colour node the engine installed on a tile-wrapped chunk
   * material. Only valid while greedy meshing is on: without it the mesh
   * carries atlas UVs instead of tile repeats.
   */
  apply(
    material: THREE.MeshStandardMaterial | THREE.MeshLambertMaterial,
    surface: BlockSurface
  ): void {
    // Blended surfaces keep the engine's node, which carries their alpha.
    if (surface.alphaMode === "blend") {
      return;
    }
    const { cols, rows, tileSize, cellSize, canvas } = this.#layout;
    const size = vec2(canvas.width, canvas.height);

    // Cell of the tile, counted from the bottom-left like texture UVs.
    const region = attribute<"vec4">("tileRegion", "vec4");
    const cell = floor(region.xy.mul(vec2(cols, rows)));

    const repeats = uv();
    const gutter = (cellSize - tileSize) / 2;
    const texel = cell.mul(cellSize).add(gutter).add(fract(repeats).mul(tileSize));
    const scale = vec2(tileSize).div(size);
    const sampled = texture(this.#atlas, texel.div(size)).grad(dFdx(repeats).mul(scale), dFdy(repeats).mul(scale));

    const tint = reference("color", "color", material);
    (material as { colorNode?: unknown; }).colorNode = Fn(() => {
      if (surface.alphaMode === "mask") {
        sampled.a.lessThan(surface.alphaCutoff).discard();
      }

      return vec4(tint, float(1)).mul(vec4(sampled.rgb, float(1)));
    })();
  }
}
