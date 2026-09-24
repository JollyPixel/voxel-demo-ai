// Import Third-party Dependencies
import {
  DockFacade,
  Pane,
  formatCount,
  formatMilliseconds
} from "@jolly-pixel/ui";
import { ViewDistance, type VoxelEngine } from "@jolly-pixel/voxel.renderer";
import type * as THREE from "three/webgpu";

// Import Internal Dependencies
import { AO_STRENGTH } from "../app/config.ts";
import type { Tileset } from "../blocks/registry.ts";
import { createEditorArchive } from "../export/editorArchive.ts";
import type { Gtao } from "../scene/gtao.ts";
import type { Effects } from "../scene/effects.ts";
import type { Lighting } from "../scene/lighting.ts";
import type { WorldDefinition, ZoneTimings } from "../world.ts";

export interface BuildReport {
  seed: number;
  copies: number;
  /**
   * Voxel write time by zone.
   */
  timings: ZoneTimings;
  meshMs: number;
  chunkCount: number;
}

export interface PanelContext {
  world: WorldDefinition;
  engine: VoxelEngine;
  lighting: Lighting;
  gtao: Gtao;
  effects: Effects;
  tileset: Tileset;
  build: BuildReport;
}

export interface FrameSample {
  fps: number;
  frameMs: number;
  mesh: { chunks: number; vertices: number; };
  info: THREE.WebGPURenderer["info"];
  /**
   * Latched on the renderer's "draw": `info.render` resets on every
   * animation-loop tick, including the ones the frame cap skips.
   */
  drawCalls: number;
}

/**
 * Benchmark readouts and render toggles, docked on the right. F3 hides it.
 */
export function createBenchmarkPanel(
  context: PanelContext
): { update: (sample: FrameSample) => void; } {
  const { world, engine, build } = context;
  const dock = DockFacade.query("#tools");
  keepCanvasFocused(dock.element);
  document.addEventListener("keydown", (event) => {
    if (event.key === "F3") {
      event.preventDefault();
      dock.hidden = !dock.hidden;
    }
  });

  const pane = new Pane({
    title: `${world.title} · seed ${build.seed}`,
    container: dock.element,
    grow: false,
    collapsible: true
  });

  const stats = {
    fps: 0,
    frameMs: 0,
    voxels: engine.world.voxelCount,
    chunks: build.chunkCount,
    meshed: 0,
    triangles: 0,
    drawCalls: 0,
    geometries: 0,
    textures: 0,
    writeMs: Object.values(build.timings).reduce((sum, ms) => sum + ms, 0),
    meshMs: build.meshMs,
    saved: "Run save/load to measure"
  };
  const benchmark = pane.addFolder({ title: `Benchmark · ${build.copies} scene(s)` });
  benchmark.addMonitors(stats, {
    fps: { label: "FPS", format: formatCount },
    frameMs: { label: "frame", format: formatMilliseconds },
    voxels: { label: "voxels", format: formatCount },
    chunks: { label: "chunks", format: formatCount },
    meshed: { label: "meshed", format: formatCount },
    triangles: { label: "triangles", format: formatCount },
    drawCalls: { label: "draw calls", format: formatCount },
    geometries: { label: "geometries", format: formatCount },
    textures: { label: "textures", format: formatCount },
    writeMs: { label: "voxel write", format: formatMilliseconds },
    meshMs: { label: "mesh", format: formatMilliseconds },
    saved: { label: "save/load" }
  });
  benchmark.addMonitors(build.timings, Object.fromEntries(
    Object.keys(build.timings).map((name) => [name, { label: name.toLowerCase(), format: formatMilliseconds }])
  ));
  benchmark.addButton({ title: "Measure save/load" }).on("click", () => {
    stats.saved = measureSaveLoad(engine);
    benchmark.refresh();
  });

  addEditorExport(pane, context);
  addRenderToggles(pane, context);
  dock.sync();

  return {
    update({ fps, frameMs, mesh, info, drawCalls }) {
      stats.fps = Math.round(fps);
      stats.frameMs = Math.round(frameMs * 10) / 10;
      stats.meshed = mesh.chunks;
      stats.triangles = Math.round(mesh.vertices / 3);
      stats.drawCalls = drawCalls;
      stats.geometries = info.memory.geometries;
      stats.textures = info.memory.textures;
      // Read by tests/benchmark.mjs.
      Object.assign(window, { __worldMetrics: { ...stats } });
      benchmark.refresh();
    }
  };
}

/**
 * Downloads the world as an archive for the voxel-map editor's Map Config
 * import.
 */
function addEditorExport(
  pane: Pane,
  { world, engine, tileset, build }: PanelContext
): void {
  const status = { exported: "Not exported yet" };
  const folder = pane.addFolder({ title: "Voxel-map editor", expanded: false });
  folder.addMonitors(status, { exported: { label: "archive" } });
  folder.addButton({ title: "Export .zip" }).on("click", () => {
    try {
      const { bytes, entries } = createEditorArchive({
        world: engine.save(),
        name: world.id,
        tileset: {
          id: tileset.definition.id,
          tileSize: tileset.definition.tileSize,
          atlas: tileset.atlas
        }
      });
      const decoded = Object.values(entries).reduce((sum, size) => sum + size, 0);
      download(bytes, `${world.id}-seed-${build.seed}.zip`);
      status.exported = `${(bytes.byteLength / 1048576).toFixed(1)} MiB zip · ${(decoded / 1048576).toFixed(1)} MiB decoded`;
    }
    catch (error) {
      status.exported = error instanceof Error ? error.message : String(error);
      console.error(error);
    }
    folder.refresh();
  });
}

function download(
  bytes: Uint8Array<ArrayBuffer>,
  fileName: string
): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function addRenderToggles(
  pane: Pane,
  { world, engine, lighting, gtao, effects }: PanelContext
): void {
  const options = {
    shadows: lighting.shadows,
    occlusion: engine.ambientOcclusion > 0,
    gtao: gtao.enabled,
    greedy: engine.greedy,
    water: true,
    clouds: true,
    wireframe: false,
    chunkBounds: false,
    distance: 0
  };

  const render = pane.addFolder({ title: "Render" });
  render.addBinding(options, "shadows").on("change", ({ value }) => lighting.setShadows(value));
  render.addBinding(options, "occlusion", { label: "ambient occlusion" }).on("change", ({ value }) => {
    engine.ambientOcclusion = value ? AO_STRENGTH : 0;
  });
  render.addBinding(options, "gtao", { label: "GTAO" }).on("change", ({ value }) => gtao.setEnabled(value));
  render.addBinding(options, "greedy").on("change", ({ value }) => {
    engine.greedy = value;
    engine.markAllChunksDirty("toggle");
  });
  render.addBinding(options, "water").on("change", ({ value }) => {
    effects.water.visible = value;
  });
  render.addBinding(options, "clouds").on("change", ({ value }) => {
    effects.clouds.visible = value;
  });
  render.addBinding(options, "distance", { min: 0, max: 12, step: 1 }).on("change", ({ value }) => {
    engine.viewDistance = value ? new ViewDistance({ chunks: value }) : ViewDistance.Unlimited;
  });
  render.addBinding(options, "wireframe").on("change", ({ value }) => {
    engine.inspector.mode = value ? "wireframe" : "off";
  });
  render.addBinding(options, "chunkBounds").on("change", ({ value }) => {
    engine.inspector.chunkBounds = value;
  });

  const visibleLayers = Object.fromEntries(world.blocks.layers.map((name) => [name, true]));
  const layers = pane.addFolder({ title: "Layers" });
  for (const name of world.blocks.layers) {
    layers.addBinding(visibleLayers, name).on("change", ({ value }) => engine.world.setLayerVisible(name, value));
  }
}

/**
 * Round-trips the world through JSON; times save() and load(), not the JSON.
 */
function measureSaveLoad(
  engine: VoxelEngine
): string {
  const saveStart = performance.now();
  const saved = engine.save();
  const saveMs = performance.now() - saveStart;
  const json = JSON.stringify(saved);

  const loadStart = performance.now();
  engine.load(JSON.parse(json));
  const loadMs = performance.now() - loadStart;

  return `${saveMs.toFixed(0)} / ${loadMs.toFixed(0)} ms · ${(json.length / 1048576).toFixed(1)} MiB`;
}

/**
 * Hands keyboard focus back to the canvas after using the pane, so the fly
 * controls keep working.
 */
function keepCanvasFocused(
  dock: HTMLElement
): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#scene");
  if (!canvas) {
    throw new Error("panel: missing #scene canvas");
  }

  canvas.addEventListener("pointerdown", () => focusCanvas(canvas));
  dock.addEventListener("pointerup", () => requestAnimationFrame(() => focusCanvas(canvas)));
}

function focusCanvas(
  canvas: HTMLCanvasElement
): void {
  canvas.focus({ preventScroll: true });
}
