// Import Internal Dependencies
import type { WorldDefinition } from "../core/world.ts";

type WorldLoader = () => Promise<{ default: WorldDefinition; }>;

export const WORLDS: Readonly<Record<string, WorldLoader>> = {
  "floating-tomb": () => import("./floating-tomb/index.ts"),
  "test-pad": () => import("./test-pad/index.ts"),
  "valley-shrine": () => import("./valley-shrine/index.ts")
};

export const DEFAULT_WORLD = "floating-tomb";

export async function loadWorld(
  id: string
): Promise<WorldDefinition> {
  const loader = Object.hasOwn(WORLDS, id) ? WORLDS[id] : undefined;
  if (!loader) {
    throw new Error(`unknown world "${id}", expected one of: ${Object.keys(WORLDS).join(", ")}`);
  }

  return (await loader()).default;
}
