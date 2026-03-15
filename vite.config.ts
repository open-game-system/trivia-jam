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
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-dom/server": path.resolve(__dirname, "node_modules/react-dom/server"),
      "react-dom/client": path.resolve(__dirname, "node_modules/react-dom/client"),
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
