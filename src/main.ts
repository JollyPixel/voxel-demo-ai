// Import Third-party Dependencies
import { Control, Controls } from "@jolly-pixel/ui";

// Import Internal Dependencies
import "./style.css";
import { readConfig } from "./core/app/config.ts";
import { runWorld } from "./core/app/runWorld.ts";
import { DEFAULT_WORLD, loadWorld } from "./worlds/index.ts";

// Registers the declarative controls declared by index.html.
void Control;
void Controls;

const config = readConfig(location.search, DEFAULT_WORLD);
await runWorld(await loadWorld(config.world), config);
