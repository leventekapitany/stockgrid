import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@stock/eslint-config/base";
import { reactConfig } from "@stock/eslint-config/react";

export default defineConfig(
  {
    ignores: [".nitro/**", ".output/**", ".tanstack/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
);
