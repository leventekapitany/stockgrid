import { defineConfig } from "eslint/config";

import { baseConfig } from "@stock/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);
