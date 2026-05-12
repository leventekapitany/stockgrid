import { defineConfig } from "eslint/config";

import { baseConfig } from "@stock/eslint-config/base";
import { reactConfig } from "@stock/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
);
