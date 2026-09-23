// Import Third-party Dependencies
import * as THREE from "three/webgpu";
import { Runtime } from "@jolly-pixel/runtime";
import { Control, Controls } from "@jolly-pixel/ui";
import { OrbitFlyCamera } from "@jolly-pixel/engine";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer/plugins/engine/index.ts";
import { loadTilesets } from "@jolly-pixel/voxel.renderer";

// Import Internal Dependencies
import "./style.css";
import { createBenchmarkPanel } from "./bench/panel.ts";
import { createTileset, LAYERS, surfaceFinish } from "./blocks/index.ts";
import { Brush } from "./builder/Brush.ts";
import { AO_STRENGTH, readConfig } from "./config.ts";
import { createEffects } from "./scene/effects.ts";
import { installGtao } from "./scene/gtao.ts";
import { SUN_DIRECTION, configureRendering, createLighting } from "./scene/lighting.ts";
import { VIEWS } from "./scene/views.ts";
import { sceneBounds } from "./site.ts";
import { buildTestPad, buildZones, type ZoneTimings } from "./zones/index.ts";

// Registers the declarative controls declared by index.html.
void Control;
void Controls;

// CONSTANTS
const kStatsInterval = 30;

const config = readConfig(location.search);
const loading = showLoading("Building the Floating Tomb…");

const tileset = createTileset();
const runtime = await Runtime.create("#scene", {
  includePerformanceStats: { mount: true, position: "bottom-right" },
  focusCanvas: false
});
const renderer = runtime.renderer.getSource();
const scene = runtime.world.sceneManager.getSource();
configureRendering(renderer, scene, config);

const pose = VIEWS[config.view];
const camera = runtime.world.createActor("camera").addComponentAndGet(OrbitFlyCamera, {
  position: pose,
  yaw: pose.yaw,
  pitch: pose.pitch,
  moveSpeed: 28,
  maxMoveSpeed: 210,
  focusMode: "none"
});
const gtao = installGtao(camera, config.gtao);
const voxel = runtime.world.createActor("terrain").addComponentAndGet(VoxelRenderer, {
  focus: camera.actor.object3D,
  greedy: config.greedy,
  chunkSize: 32,
  layers: [...LAYERS],
  blocks: tileset.blocks,
  tilesets: await loadTilesets([tileset.definition]),
  material: "standard",
  alphaTest: 0.35,
  rebuildBudgetMs: 12,
  castShadow: config.shadows,
  receiveShadow: config.shadows,
  ambientOcclusion: config.ao ? AO_STRENGTH : 0,
  tileMinification: config.mips ? "average" : "nearest",
  materialCustomizer: (material, _tilesetId, surface) => {
    if (material instanceof THREE.MeshStandardMaterial) {
      Object.assign(material, surfaceFinish(surface.materialGroup));
    }
  }
});
const { engine } = voxel;
runtime.metrics.addSource(engine.inspector);
await runtime.load({ skipLoadingScreen: true });

const brush = Brush.forWorld(engine.world);
const timings = engine.world.transaction(() => (config.pad ?
  { Pad: measure(() => buildTestPad(brush)) } :
  buildZones(brush, config)));

const effects = createEffects(brush.fixtures, SUN_DIRECTION);
effects.root.visible = !config.pad;
scene.add(effects.root);
scene.backgroundNode = effects.sky;
const lighting = createLighting(renderer, scene, {
  shadows: config.shadows,
  lights: brush.fixtures.lights,
  bounds: sceneBounds(config.copies),
  chunks: engine
});

const chunkCount = [...engine.world.getAllChunks()].length;
const meshMs = await measureAsync(async() => {
  engine.flush();
  await engine.whenIdle();
});
loading.remove();

const panel = createBenchmarkPanel({
  engine,
  lighting,
  gtao,
  effects,
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
    voxels: engine.world.voxelCount,
    chunks: chunkCount,
    writeMs,
    meshMs,
    ...zoneTimings
  });
}

function showLoading(message: string): HTMLElement {
  const element = document.createElement("div");
  element.id = "loading";
  element.textContent = message;
  document.body.append(element);

  return element;
}

function measure(task: () => void): number {
  const start = performance.now();
  task();

  return performance.now() - start;
}

async function measureAsync(task: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await task();

  return performance.now() - start;
}
