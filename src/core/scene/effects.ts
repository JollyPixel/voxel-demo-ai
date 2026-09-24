// Import Third-party Dependencies
import * as THREE from "three/webgpu";
import {
  cameraPosition,
  color,
  cos,
  dot,
  float,
  max,
  mix,
  mx_noise_float,
  normalize,
  positionLocal,
  positionWorld,
  pow,
  reflect,
  smoothstep,
  time,
  transformNormalToView,
  uniform,
  uv,
  vec2,
  vec3
} from "three/tsl";

// Import Internal Dependencies
import type { Fixtures } from "../builder/fixtures.ts";
import { createRandom } from "../utils/random.ts";
import { sunDirection, type Atmosphere, type CloudOptions, type SkyColors } from "./atmosphere.ts";

// CONSTANTS
const kPuffsPerCloud = 6;
/**
 * Ripples on the pools: direction (x, z), wavelength and speed in world
 * units, and slope. Their sum drives the surface normal.
 */
const kWaves = [
  { direction: [0.8, 0.6], wavelength: 3.1, speed: 1.3, slope: 0.07 },
  { direction: [-0.55, 0.83], wavelength: 1.9, speed: 1.7, slope: 0.05 },
  { direction: [0.2, -0.98], wavelength: 1.2, speed: 2.1, slope: 0.035 },
  { direction: [-0.93, -0.37], wavelength: 0.7, speed: 2.6, slope: 0.025 }
] as const;

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
  atmosphere: Atmosphere
): Effects {
  const sun = sunDirection(atmosphere);
  const water = createWater(fixtures, sun, atmosphere.sky);
  const clouds = atmosphere.clouds ? new CloudSea(atmosphere.clouds) : null;
  const cloudMesh = clouds?.mesh ?? new THREE.Group();

  const root = new THREE.Group();
  root.add(water, cloudMesh);

  return {
    root,
    water,
    clouds: cloudMesh,
    sky: skyColor(normalize(positionLocal), uniform(sun), atmosphere.sky),
    animate(dt) {
      clouds?.drift(dt);
    }
  };
}

function createWater(
  { pools, waterfalls }: Readonly<Fixtures>,
  sunDirection: THREE.Vector3,
  sky: SkyColors
): THREE.Group {
  const group = new THREE.Group();

  const surface = createPoolMaterial(uniform(sunDirection), sky);
  for (const { center, width, depth } of pools) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), surface);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(...center);
    pool.receiveShadow = true;
    group.add(pool);
  }

  const falling = createWaterfallMaterial();
  for (const { center: [x, y, z], width, height } of waterfalls) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height), falling);
    sheet.rotation.y = Math.PI / 2;
    sheet.position.set(x, y, z);
    group.add(sheet);
  }

  return group;
}

/**
 * Still water: a normal rippled by a few travelling waves, laid out in world
 * space so every pool and channel shares one scale. Fresnel decides how much
 * of the sky the surface mirrors and how opaque it looks; the low roughness
 * turns the sun into a glint.
 */
function createPoolMaterial(
  sun: THREE.Node<"vec3">,
  sky: SkyColors
): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial({
    transparent: true,
    depthWrite: false,
    roughness: 0.08,
    metalness: 0
  });

  const position = positionWorld.xz;
  // A slow wobble keeps the wave crests from lining up.
  const wobble = mx_noise_float(vec3(position.mul(0.18), time.mul(0.12))).mul(2);
  let slopeX: THREE.Node<"float"> = float(0);
  let slopeZ: THREE.Node<"float"> = float(0);
  for (const { direction: [dx, dz], wavelength, speed, slope } of kWaves) {
    const k = (Math.PI * 2) / wavelength;
    const phase = dot(position, vec2(dx, dz))
      .mul(k)
      .add(time.mul(speed))
      .add(wobble);
    const gradient = cos(phase).mul(slope);
    slopeX = slopeX.add(gradient.mul(dx));
    slopeZ = slopeZ.add(gradient.mul(dz));
  }
  const normal = normalize(vec3(slopeX.negate(), 1, slopeZ.negate()));

  const view = normalize(cameraPosition.sub(positionWorld));
  const fresnel = pow(float(1).sub(max(dot(normal, view), 0)), 5).mul(0.9).add(0.06);
  const mirrored = skyColor(reflect(view.negate(), normal), sun, sky);

  material.normalNode = transformNormalToView(normal);
  // Crests facing the viewer catch a little more light than the troughs.
  const crest = dot(vec2(slopeX, slopeZ), view.xz).mul(1.5);
  material.colorNode = mix(color("#1d7f8c"), color("#0e4556"), fresnel).add(crest.mul(0.12));
  material.emissiveNode = mirrored.mul(fresnel.add(0.08));
  material.opacityNode = mix(float(0.84), float(0.97), fresnel);

  return material;
}

/**
 * Falling water: streaks of foam stretched along the fall and scrolling
 * down, thinning at the sides and fading out as the sheet drops into the
 * clouds.
 */
function createWaterfallMaterial(): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: true
  });

  const flow = positionWorld.y.add(time.mul(9)).mul(0.08);
  const streaks = mx_noise_float(vec3(positionWorld.z.mul(2.2), flow, time.mul(0.2)))
    .add(mx_noise_float(vec3(positionWorld.z.mul(5), flow.mul(2.5), 3)).mul(0.5));
  const foam = smoothstep(float(0.05), float(0.6), streaks);
  const { x: across, y: along } = uv();
  const sides = smoothstep(float(0), float(0.18), across).mul(smoothstep(float(1), float(0.82), across));
  const lip = smoothstep(float(0.985), float(1), along);

  material.colorNode = mix(color("#3f9fb6"), color("#effcff"), max(foam, lip));
  material.opacityNode = mix(float(0.45), float(0.9), foam).mul(sides).mul(smoothstep(float(0), float(0.45), along));

  return material;
}

/**
 * Sky colour for a view direction: warm haze at the horizon, deep blue
 * overhead and a soft glow around the sun. It paints the background, where
 * the local position is the view direction, and the pools' reflections.
 */
function skyColor(
  direction: THREE.Node<"vec3">,
  sun: THREE.Node<"vec3">,
  sky: SkyColors
): THREE.Node<"vec3"> {
  const up = direction.y;
  const glow = pow(max(dot(direction, sun), 0), float(12)).mul(0.55);
  const lower = mix(color(sky.horizon), color(sky.blue), smoothstep(float(0), float(0.18), up));
  const gradient = mix(lower, color(sky.zenith), smoothstep(float(0.18), float(0.7), up));
  const below = mix(gradient, color(sky.haze), smoothstep(float(0), float(-0.25), up));

  return below.add(vec3(1, 0.85, 0.6).mul(glow));
}

/**
 * Low-poly cumulus below the islands: clusters of flat-shaded puffs drawn as
 * one instanced mesh, drifting east and wrapping around.
 */
class CloudSea {
  readonly mesh: THREE.InstancedMesh;
  readonly #puffs: THREE.Matrix4[] = [];
  readonly #options: CloudOptions;

  constructor(
    options: CloudOptions
  ) {
    this.#options = options;
    const { count, x, y, z } = options;
    const material = new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: "#6f7a92", flatShading: true });
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material, count * kPuffsPerCloud);
    // The puffs move every frame; their bounds are never recomputed.
    this.mesh.frustumCulled = false;
    const random = createRandom(163);
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const rotation = new THREE.Quaternion();

    for (let cloud = 0; cloud < count; cloud++) {
      const size = 6 + random() * 12;
      const centre = new THREE.Vector3(
        x[0] + random() * (x[1] - x[0]),
        y[1] - random() * (y[1] - y[0]),
        z[0] + random() * (z[1] - z[0])
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
    dt: number
  ): void {
    const { x: [minX, maxX], drift } = this.#options;
    const dx = dt * drift;
    for (const [index, puff] of this.#puffs.entries()) {
      puff.elements[12] += dx;
      if (puff.elements[12] > maxX) {
        puff.elements[12] -= maxX - minX;
      }
      this.mesh.setMatrixAt(index, puff);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
