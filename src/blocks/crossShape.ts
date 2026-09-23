// Import Third-party Dependencies
import {
  Face,
  type BlockShape,
  type FaceDefinition
} from "@jolly-pixel/voxel.renderer";

type Vec3 = [number, number, number];

// CONSTANTS
const kDiagonal = Math.SQRT1_2;

function diagonalQuad(
  vertices: Vec3[],
  normal: Vec3
): FaceDefinition {
  return {
    face: Face.PosY,
    normal,
    vertices,
    uvs: [[0, 0], [1, 0], [1, 1], [0, 1]],
    cull: null,
    slot: null
  };
}

/**
 * Two crossed diagonal planes, each emitted twice with opposite winding, for
 * plants drawn from alpha-masked tiles. Never culled and never occluding.
 */
export const crossShape: BlockShape = {
  id: "cross",
  collisionHint: "none",
  occludes: () => false,
  faces: [
    diagonalQuad([[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]], [kDiagonal, 0, -kDiagonal]),
    diagonalQuad([[1, 0, 1], [0, 0, 0], [0, 1, 0], [1, 1, 1]], [-kDiagonal, 0, kDiagonal]),
    diagonalQuad([[1, 0, 0], [0, 0, 1], [0, 1, 1], [1, 1, 0]], [kDiagonal, 0, kDiagonal]),
    diagonalQuad([[0, 0, 1], [1, 0, 0], [1, 1, 0], [0, 1, 1]], [-kDiagonal, 0, -kDiagonal])
  ]
};
