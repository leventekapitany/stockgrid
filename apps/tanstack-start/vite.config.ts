import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const externalNodePackages = [
  "yahoo-finance2",
  "@deno/shim-deno",
  "fetch-mock-cache",
  "tough-cookie",
  "tough-cookie-file-store",
];

function isExternalNodePackage(id: string) {
  return externalNodePackages.some(
    (packageName) => id === packageName || id.startsWith(`${packageName}/`),
  );
}

export default defineConfig({
  server: {
    port: 3000,
  },
  ssr: {
    external: externalNodePackages,
  },
  build: {
    rollupOptions: {
      external: (id) => id === "cloudflare:sockets" || isExternalNodePackage(id),
    },
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    nitro({
      preset: process.env.NITRO_PRESET ?? "cloudflare_module",
      compatibilityDate: "2026-05-11",
      externals: {
        external: ["yahoo-finance2", "@deno/shim-deno"],
      },
      cloudflare: {
        nodeCompat: true,
      },
    }),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
});
