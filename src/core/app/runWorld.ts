// Import Third-party Dependencies
import * as THREE from "three/webgpu";
import { Runtime } from "@jolly-pixel/runtime";
import { OrbitFlyCamera } from "@jolly-pixel/engine";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer/engine";
import { loadTilesets } from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import { createBenchmarkPanel } from "../bench/panel.ts";
import { DEFAULT_FINISH } from "../blocks/materials.ts";
import { Brush, WORLD_LAYER } from "../builder/Brush.ts";
import { createEffects } from "../scene/effects.ts";
import { configureRendering, createLighting } from "../scene/lighting.ts";
import { createScenePipeline } from "../scene/pipeline.ts";
import {
  buildZones,
  sceneBounds,
  type WorldDefinition,
  type ZoneTimings
} from "../world.ts";
import {
  AO_STRENGTH,
  CHUNK_SIZE,
  farDistance,
  type DemoConfig
} from "./config.ts";

// CONSTANTS
const kStatsInterval = 30;

export async function runWorld(
  world: WorldDefinition,
  config: DemoConfig
): Promise<void> {
  document.title = `${world.title} · JollyPixel`;
  const loading = showLoading(`Building ${world.title}…`);
  const { atmosphere, blocks } = world;

  const tileset = blocks.createTileset();
  const runtime = await Runtime.create("#scene", {
    includePerformanceStats: { mount: true, position: "bottom-right" },
    focusCanvas: false
  });
  const renderer = runtime.renderer.getSource();
  const scene = runtime.world.sceneManager.getSource();
  configureRendering(renderer, scene, { shadows: config.shadows, atmosphere });

  const view = config.view !== null && Object.hasOwn(world.views, config.view) ? config.view : world.defaultView;
  const pose = world.views[view];
  const camera = runtime.world.createActor("camera").addComponentAndGet(OrbitFlyCamera, {
    position: pose,
    yaw: pose.yaw,
    pitch: pose.pitch,
    moveSpeed: 28,
    maxMoveSpeed: 210,
    focusMode: "none"
  });
  const pipeline = createScenePipeline(camera, { gtao: config.gtao, oit: config.oit });
  const { view: voxels } = runtime.world.createActor("terrain").addComponentAndGet(VoxelRenderer, {
    focus: camera.actor.object3D,
    document: {
      chunkSize: CHUNK_SIZE,
      layers: [WORLD_LAYER],
      blocks: tileset.blocks,
      materialGroups: blocks.materialGroups
    },
    tilesets: await loadTilesets([tileset.definition]),
    rendering: {
      material: "standard",
      alphaTest: 0.35,
      tileMinification: config.mips ? "average" : "nearest",
      // Grouped blocks already carry their group's finish; this runs after it.
      customizer: (material, _tilesetId, surface) => {
        if (surface.materialGroup === undefined && material instanceof THREE.MeshStandardMaterial) {
          Object.assign(material, DEFAULT_FINISH);
        }
      }
    },
    lighting: {
      ambientOcclusion: config.ao ? AO_STRENGTH : 0,
      castShadow: config.shadows,
      receiveShadow: config.shadows
    },
    range: {
      farDistance: farDistance(config.far)
    },
    meshing: {
      budgetMs: 12,
      workers: config.workers > 0 ?
        {
          count: config.workers,
          createWorker: () => new Worker(new URL("./meshWorker.ts", import.meta.url), { type: "module" })
        } :
        undefined
    }
  });
  const { world: voxelWorld } = voxels.document;
  runtime.metrics.addSource(voxels.inspector);
  await runtime.load({ skipLoadingScreen: true });

  const brush = Brush.forWorld(voxelWorld);
  const timings = buildZones(world, brush, config);

  const effects = createEffects(brush.fixtures, atmosphere);
  scene.add(effects.root);
  scene.backgroundNode = effects.sky;
  const lighting = createLighting(renderer, scene, {
    shadows: config.shadows,
    atmosphere,
    lights: brush.fixtures.lights,
    bounds: sceneBounds(world, config.copies),
    voxels
  });

  const chunkCount = [...voxelWorld.getAllChunks()].length;
  // The first build runs before VoxelRenderer samples its focus (FEEDBACK F-12).
  voxels.focus = camera.actor.object3D.getWorldPosition(new THREE.Vector3());
  /*
   * flush() meshes on the main thread even with workers; the frame loop
   * started by runtime.load() ticks the view, which feeds the workers.
   */
  const meshMs = await measureAsync(async() => {
    if (!meshesInWorkers(config)) {
      voxels.flush();
    }
    await voxels.whenIdle();
  });
  loading.remove();

  const panel = createBenchmarkPanel({
    world,
    voxels,
    lighting,
    pipeline,
    effects,
    tileset,
    build: {
      seed: config.seed,
      copies: config.copies,
      timings,
      meshMs,
      chunkCount,
      workers: meshesInWorkers(config) ? config.workers : 0
    }
  });
  startFrameLoop();
  logBuild(timings);

  function startFrameLoop(): void {
    let last = performance.now();
    let frames = 0;

    function frame(now: number): void {
      effects.animate(Math.min(0.1, (now - last) / 1000));
      last = now;

      if (++frames % kStatsInterval === 0) {
        const { fps = 0, ms = 0 } = runtime.stats.snapshot();
        panel.update({ fps, frameMs: ms, mesh: voxels.inspector.mesh.stats, renderer: runtime.metrics.renderer.frame });
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function logBuild(zoneTimings: ZoneTimings): void {
    const writeMs = Object.values(zoneTimings).reduce((sum, ms) => sum + ms, 0);

    console.table({
      ...config,
      view,
      voxels: voxelWorld.voxelCount,
      chunks: chunkCount,
      writeMs,
      meshMs,
      ...zoneTimings
    });
  }
}

/**
 * The view ignores `meshing.workers` without SharedArrayBuffer.
 */
function meshesInWorkers(
  config: DemoConfig
): boolean {
  return config.workers > 0 && globalThis.crossOriginIsolated;
}

function showLoading(message: string): HTMLElement {
  const element = document.createElement("div");
  element.id = "loading";
  element.textContent = message;
  document.body.append(element);

  return element;
}

async function measureAsync(task: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await task();

  return performance.now() - start;
}
