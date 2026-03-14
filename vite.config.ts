import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { existsSync } from "fs";

// cast-kit is linked from ../open-game-system and not published to npm yet.
// In CI (where the monorepo symlink doesn't exist), stub it as an empty module.
const castKitAvailable = existsSync("node_modules/@open-game-system/cast-kit");

const castKitStubPlugin = !castKitAvailable
  ? {
      name: "stub-cast-kit",
      resolveId(id: string) {
        if (id.startsWith("@open-game-system/cast-kit")) {
          return "\0cast-kit-stub";
        }
      },
      load(id: string) {
        if (id === "\0cast-kit-stub") {
          return "export const createCastKitContext = () => ({ Provider: () => null, useState: () => ({}), useSend: () => () => {}, useStatus: () => 'idle', useDevices: () => [], ProviderFromClient: () => null });";
        }
      },
    }
  : null;

const config = defineConfig({
  plugins: [
    nitro({
      rollupConfig: {
        external: [/^@sentry\//],
      },
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    ...(castKitStubPlugin ? [castKitStubPlugin] : []),
    tanstackStart(),
    viteReact(),
  ],
  css: {
    postcss: "./postcss.config.js",
  },
});

export default config;
