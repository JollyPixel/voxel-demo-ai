// Import Internal Dependencies
import { VIEWS, type ViewName } from "./scene/views.ts";

/**
 * Strength of the ambient occlusion the mesher bakes into chunk vertices.
 */
export const AO_STRENGTH = 0.75;

/**
 * Demo settings, read from the page's query string (see README).
 */
export interface DemoConfig {
  seed: number;
  /**
   * Scene copies tiled on a grid, for stress testing.
   */
  copies: number;
  greedy: boolean;
  shadows: boolean;
  /**
   * Ambient occlusion baked into the chunk vertices by the mesher.
   */
  ao: boolean;
  /**
   * Screen-space ambient occlusion (GTAO) as a camera post-process.
   */
  gtao: boolean;
  /**
   * Distant tiles fade to their average colour, so they do not sparkle.
   */
  mips: boolean;
  /**
   * Replaces the scene with the shape and orientation test pad.
   */
  pad: boolean;
  view: ViewName;
}

export function readConfig(
  search: string
): DemoConfig {
  const params = new URLSearchParams(search);
  const pad = params.get("pad") === "1";
  const requestedView = params.get("view");
  const view = requestedView !== null && requestedView in VIEWS ?
    requestedView as ViewName :
    defaultView(pad);

  function clamped(key: string, fallback: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Number(params.get(key)) || fallback));
  }

  return {
    seed: clamped("seed", 1337, 1, 0x7fffffff),
    copies: clamped("copies", 1, 1, 4),
    greedy: params.get("greedy") !== "0",
    shadows: params.get("shadows") !== "0",
    ao: params.get("ao") !== "0",
    gtao: params.get("gtao") === "1",
    mips: params.get("mips") !== "0",
    pad,
    view
  };
}

function defaultView(
  pad: boolean
): ViewName {
  return pad ? "pad" : "overview";
}
