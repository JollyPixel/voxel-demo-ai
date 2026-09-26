// Import Internal Dependencies
import type { Bounds } from "../../core/world.ts";

type Point = readonly [x: number, z: number];

/**
 * First air cell above the valley floor; the ground voxels sit at
 * `FLOOR - 1`.
 */
export const FLOOR = 20;
/**
 * Height of every water surface in the valley. It lies inside the ground
 * voxels, so the one water table only shows where the ground is carved
 * below it.
 */
export const WATER = FLOOR - 0.4;
/**
 * Half the side of the square the world fits in, centred on the origin.
 */
export const HALF_SIZE = 176;

/**
 * Where everything sits, in world coordinates: north is -z and the sun sets
 * in the south-west. The valley is an ellipse opening south into a gorge
 * that ends at a cliff over the cloud sea.
 */
export const SITE = {
  valley: { x: 0, z: -8, rx: 94, rz: 84 },
  gorge: { x: -22, halfWidth: 22, from: 40, lip: 158 },
  /**
   * The main axis: overlook, grand torii, drum bridge, gate and main hall.
   */
  axis: -10,
  compound: { x: -10, z: -46, halfX: 36, halfZ: 34, corridor: 5 },
  hall: { x: -10, z: -56 },
  bell: { x: -66, z: -38 },
  pagoda: { x: 50, z: -54 },
  dryGarden: { from: [30, -28] as Point, to: [74, -6] as Point },
  /**
   * The stream: from the plunge pool under the east cascade, west across
   * the axis, into the koi pond, then south down the gorge to the lip.
   */
  cascade: { x: 93, z: 10, top: 78, pool: 7 },
  river: [[84, 10], [64, 17], [40, 22], [14, 27], [-10, 26], [-26, 29], [-42, 32]] as readonly Point[],
  outlet: [[-48, 44], [-40, 54], [-34, 66], [-34, 159]] as readonly Point[],
  riverHalfWidth: 2.5,
  pond: { x: -58, z: 32, rx: 17, rz: 12, island: { x: -52, z: 36, radius: 3.5 } },
  teaHouse: { x: -64, z: 18 },
  bamboo: { from: [-96, 4] as Point, to: [-78, 48] as Point },
  /**
   * Open meadows planted with cherry groves, as [x0, z0, x1, z1].
   */
  groves: [
    [24, 36, 72, 72],
    [-44, -8, -26, 16],
    [34, 4, 84, 8]
  ] as readonly (readonly [number, number, number, number])[],
  drumBridge: { z: 26 },
  grandTorii: { z: 70 },
  overlook: { z: 146 },
  /**
   * The inner shrine on a mountain ledge, reached by a straight stair
   * climbing north from the valley at one voxel per step.
   */
  shrine: { x: -60, z: -114, y: 60, radius: 11, stairHalf: 3 },
  pillars: [
    { x: 78, z: -76, radius: 7, top: 104 },
    { x: -92, z: -8, radius: 7, top: 82 },
    { x: 80, z: 52, radius: 6, top: 76 },
    { x: -80, z: 72, radius: 7, top: 90 },
    { x: 30, z: 82, radius: 5, top: 66 }
  ]
} as const;

/**
 * y of the first stair step's air cell is `FLOOR`; the stair climbs one
 * voxel per voxel north until the ledge.
 */
export const SHRINE_STAIR = {
  zStart: SITE.shrine.z + SITE.shrine.radius + (SITE.shrine.y - FLOOR),
  zEnd: SITE.shrine.z + SITE.shrine.radius
} as const;

export const COPY_SPACING = { x: 400, z: 400 };

/**
 * Bounds of one copy of the scene, peaks and cliff roots included.
 */
export const EXTENT: Bounds = { min: [-HALF_SIZE, -50, -HALF_SIZE], max: [HALF_SIZE, 175, HALF_SIZE] };
