// Import Internal Dependencies
import "./style.css";
import { readConfig } from "./core/app/config.ts";
import { runWorld } from "./core/app/runWorld.ts";
import { DEFAULT_WORLD, loadWorld } from "./worlds/index.ts";

const config = readConfig(location.search, DEFAULT_WORLD);
await runWorld(await loadWorld(config.world), config);
