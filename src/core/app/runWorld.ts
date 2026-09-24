// Import Third-party Dependencies
import * as THREE from "three/webgpu";
import { Runtime } from "@jolly-pixel/runtime";
import { OrbitFlyCamera } from "@jolly-pixel/engine";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer/plugins/engine/index.ts";
import { loadTilesets } from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import { createBenchmarkPanel } from "../bench/panel.ts";
import { DEFAULT_FINISH } from "../blocks/materials.ts";
import { Brush } from "../builder/Brush.ts";
import { createEffects } from "../scene/effects.ts";
import { gtao as gtaoPipeline, gtaoToggle } from "../scene/gtao.ts";
import { configureRendering, createLighting } from "../scene/lighting.ts";
import {
  buildZones,
  sceneBounds,
  type WorldDefinition,
  type ZoneTimings
} from "../world.ts";
import { AO_STRENGTH, type DemoConfig } from "./config.ts";

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
    focusMode: "none",
    postProcessing: config.gtao ? gtaoPipeline : null
  });
  const voxel = runtime.world.createActor("terrain").addComponentAndGet(VoxelRenderer, {
    focus: camera.actor.object3D,
    greedy: config.greedy,
    chunkSize: 32,
    layers: [...blocks.layers],
    blocks: tileset.blocks,
    tilesets: await loadTilesets([tileset.definition]),
    material: "standard",
    alphaTest: 0.35,
    rebuildBudgetMs: 12,
    castShadow: config.shadows,
    receiveShadow: config.shadows,
    ambientOcclusion: config.ao ? AO_STRENGTH : 0,
    tileMinification: config.mips ? "average" : "nearest",
    materialGroups: blocks.materialGroups,
    // Grouped blocks already carry their group's finish; this runs after it.
    materialCustomizer: (material, _tilesetId, surface) => {
      if (surface.materialGroup === undefined && material instanceof THREE.MeshStandardMaterial) {
        Object.assign(material, DEFAULT_FINISH);
      }
    }
  });
  const { engine } = voxel;
  runtime.metrics.addSource(engine.inspector);
  await runtime.load({ skipLoadingScreen: true });

  const brush = Brush.forWorld(engine.world, blocks.layers);
  const timings = engine.world.transaction(() => buildZones(world, brush, config));

  const effects = createEffects(brush.fixtures, atmosphere);
  scene.add(effects.root);
  scene.backgroundNode = effects.sky;
  const lighting = createLighting(renderer, scene, {
    shadows: config.shadows,
    atmosphere,
    lights: brush.fixtures.lights,
    bounds: sceneBounds(world, config.copies),
    chunks: engine
  });

  const chunkCount = [...engine.world.getAllChunks()].length;
  const meshMs = await measureAsync(async() => {
    engine.flush();
    await engine.whenIdle();
  });
  loading.remove();

  const panel = createBenchmarkPanel({
    world,
    engine,
    lighting,
    gtao: gtaoToggle(camera),
    effects,
    tileset,
    build: { seed: config.seed, copies: config.copies, timings, meshMs, chunkCount }
  });
  startFrameLoop();
  logBuild(timings);

  function startFrameLoop(): void {
    let last = performance.now();
    let frames = 0;
    let drawCalls = 0;
    runtime.renderer.on("draw", ({ source }) => {
      drawCalls = source.info.render.drawCalls;
    });

    function frame(now: number): void {
      effects.animate(Math.min(0.1, (now - last) / 1000));
      last = now;

      if (++frames % kStatsInterval === 0) {
        const { fps = 0, ms = 0 } = runtime.stats.snapshot();
        panel.update({ fps, frameMs: ms, mesh: engine.inspector.mesh.stats, info: renderer.info, drawCalls });
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
      voxels: engine.world.voxelCount,
      chunks: chunkCount,
      writeMs,
      meshMs,
      ...zoneTimings
    });
  }
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
