import { defineConfig } from "vite";
import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

const config = defineConfig({
  resolve: {
    alias: {
      // Prevent dual React from linked @open-game-system packages
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  plugins: [
    nitro({
      rollupConfig: {
        external: [/^@sentry\//],
      },
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart(),
    viteReact(),
  ],
  css: {
    postcss: "./postcss.config.js",
  },
});

export default config;
