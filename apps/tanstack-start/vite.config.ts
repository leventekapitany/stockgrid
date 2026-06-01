import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    nitro({
      preset: process.env.NITRO_PRESET ?? "cloudflare_module",
      compatibilityDate: "2026-05-11",
      cloudflare: {
        nodeCompat: true,
      },
    }),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
});
