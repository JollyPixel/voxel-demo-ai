// Import Third-party Dependencies
import * as THREE from "three/webgpu";
import {
  color,
  float,
  fract,
  max,
  mix,
  normalize,
  positionLocal,
  pow,
  sin,
  smoothstep,
  time,
  uniform,
  uv,
  vec3
} from "three/tsl";

// Import Internal Dependencies
import type { Fixtures } from "../builder/fixtures.ts";
import { createRandom } from "../utils/random.ts";

// CONSTANTS
export const SKY = {
  horizon: "#f4dcc0",
  blue: "#8db4dc",
  zenith: "#3a6aad",
  haze: "#bfcadb"
};
const kCloudCount = 150;
const kPuffsPerCloud = 6;
const kCloudSpan = { minX: -250, width: 800 };
const kCloudDrift = 0.4;

/**
 * Everything drawn outside the voxel engine: water from the zone fixtures, a
 * gradient sky and a drifting sea of clouds below the islands.
 */
export interface Effects {
  root: THREE.Group;
  water: THREE.Group;
  clouds: THREE.Object3D;
  /**
   * Scene background: the sky gradient, evaluated per view direction.
   */
  sky: THREE.Node;
  animate: (dt: number) => void;
}

export function createEffects(
  fixtures: Readonly<Fixtures>,
  sunDirection: THREE.Vector3
): Effects {
  const water = createWater(fixtures);
  const clouds = new CloudSea();

  const root = new THREE.Group();
  root.add(water, clouds.mesh);

  return {
    root,
    water,
    clouds: clouds.mesh,
    sky: createSky(sunDirection),
    animate(dt) {
      clouds.drift(dt * kCloudDrift);
    }
  };
}

function createWater(
  { pools, waterfalls }: Readonly<Fixtures>
): THREE.Group {
  const group = new THREE.Group();

  const surface = new THREE.MeshLambertNodeMaterial({ transparent: true, opacity: 0.88, emissive: "#062a35" });
  const ripple = sin(uv().x.mul(40).add(uv().y.mul(23)).add(time.mul(1.6))).mul(sin(uv().y.mul(31).sub(time.mul(1.1))));
  surface.colorNode = mix(color("#1d6f8c"), color("#6fd3cc"), smoothstep(float(0.35), float(0.95), ripple.mul(0.5).add(0.5)));
  for (const { center, width, depth } of pools) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), surface);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(...center);
    pool.receiveShadow = true;
    group.add(pool);
  }

  const falling = new THREE.MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const streak = fract(uv().y.mul(5).add(time.mul(1.4)).add(sin(uv().x.mul(37)).mul(0.3)));
  falling.colorNode = mix(color("#3d9fb8"), color("#e6fbff"), smoothstep(float(0.75), float(1), streak));
  falling.opacityNode = mix(float(0.55), float(0.9), smoothstep(float(0.6), float(1), streak)).mul(smoothstep(float(0), float(0.25), uv().y));
  const foamMaterial = new THREE.MeshLambertMaterial({ color: "#eefcff", transparent: true, opacity: 0.8 });
  for (const { center: [x, y, z], width, height } of waterfalls) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height), falling);
    sheet.rotation.y = Math.PI / 2;
    sheet.position.set(x, y, z);

    // A flattened puff where the water leaves the lip.
    const foam = new THREE.Mesh(new THREE.IcosahedronGeometry(width * 0.6, 1), foamMaterial);
    foam.scale.set(0.6, 0.35, 1);
    foam.position.set(x, y + height / 2 - 0.3, z);
    group.add(sheet, foam);
  }

  return group;
}

/**
 * Sky colour by view direction: warm haze at the horizon, deep blue overhead
 * and a soft glow around the sun. On the background skybox the local
 * position is the view direction.
 */
function createSky(
  sunDirection: THREE.Vector3
): THREE.Node {
  const direction = normalize(positionLocal);
  const sun = uniform(sunDirection);
  const glow = pow(max(direction.dot(sun), 0), float(12)).mul(0.55);
  const lower = mix(color(SKY.horizon), color(SKY.blue), smoothstep(float(0), float(0.18), direction.y));
  const gradient = mix(lower, color(SKY.zenith), smoothstep(float(0.18), float(0.7), direction.y));
  const below = mix(gradient, color(SKY.haze), smoothstep(float(0), float(-0.25), direction.y));

  return below.add(vec3(1, 0.85, 0.6).mul(glow));
}

/**
 * Low-poly cumulus below the islands: clusters of flat-shaded puffs drawn as
 * one instanced mesh, drifting east and wrapping around.
 */
class CloudSea {
  readonly mesh: THREE.InstancedMesh;
  readonly #puffs: THREE.Matrix4[] = [];

  constructor() {
    const material = new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: "#6f7a92", flatShading: true });
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material, kCloudCount * kPuffsPerCloud);
    // The puffs move every frame; their bounds are never recomputed.
    this.mesh.frustumCulled = false;
    const random = createRandom(163);
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const rotation = new THREE.Quaternion();

    for (let cloud = 0; cloud < kCloudCount; cloud++) {
      const size = 6 + random() * 12;
      const centre = new THREE.Vector3(
        kCloudSpan.minX + random() * kCloudSpan.width,
        -18 - random() * 30,
        -260 + random() * 560
      );
      for (let puff = 0; puff < kPuffsPerCloud; puff++) {
        position.set(
          centre.x + (random() - 0.5) * size * 2.2,
          centre.y + random() * size * 0.3,
          centre.z + (random() - 0.5) * size
        );
        const radius = size * (0.45 + random() * 0.45);
        scale.set(radius, radius * 0.6, radius);
        this.#puffs.push(new THREE.Matrix4().compose(position, rotation, scale));
      }
    }
    this.drift(0);
  }

  drift(
    dx: number
  ): void {
    for (const [index, puff] of this.#puffs.entries()) {
      puff.elements[12] += dx;
      if (puff.elements[12] > kCloudSpan.minX + kCloudSpan.width) {
        puff.elements[12] -= kCloudSpan.width;
      }
      this.mesh.setMatrixAt(index, puff);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
