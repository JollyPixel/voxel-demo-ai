import { defineConfig } from "oxlint";
import { typescriptConfig } from "@openally/config.oxlint";

export default defineConfig(typescriptConfig({
  env: { browser: true },
  rules: {
    "@stylistic/no-mixed-operators": "off",
    "@stylistic/max-len": "off",
    "max-params": ["error", { max: 5 }]
  }
}));
