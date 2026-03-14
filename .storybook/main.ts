import type { StorybookConfig } from "@storybook/react-vite";
import { existsSync } from "fs";
import path from "path";
import type { PluginOption } from "vite";
import { mergeConfig } from "vite";

// Stub cast-kit when the symlink doesn't exist (CI)
const castKitAvailable = existsSync(
  path.resolve(__dirname, "../node_modules/@open-game-system/cast-kit")
);

const castKitStub: PluginOption | null = !castKitAvailable
  ? {
      name: "stub-cast-kit",
      resolveId(id: string) {
        if (id.startsWith("@open-game-system/cast-kit")) return "\0cast-kit-stub";
      },
      load(id: string) {
        if (id === "\0cast-kit-stub")
          return "export const createCastKitContext = () => ({ Provider: () => null, useState: () => ({}), useSend: () => () => {}, useStatus: () => 'idle', useDevices: () => [], ProviderFromClient: () => null });";
      },
    }
  : null;

const config: StorybookConfig = {
  stories: [
    "../stories/**/*.stories.@(js|jsx|ts|tsx)",
    "../src/**/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-coverage",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: true,
  },
  core: {
    builder: "@storybook/builder-vite",
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: castKitStub ? [castKitStub] : [],
      resolve: {
        alias: {
          "~": path.resolve(__dirname, "../src"),
          // Deduplicate React for actor-kit and other packages
          react: path.resolve(__dirname, "../node_modules/react"),
          "react-dom": path.resolve(__dirname, "../node_modules/react-dom"),
          "react/jsx-runtime": path.resolve(
            __dirname,
            "../node_modules/react/jsx-runtime"
          ),
          "react/jsx-dev-runtime": path.resolve(
            __dirname,
            "../node_modules/react/jsx-dev-runtime"
          ),
        },
        dedupe: ["react", "react-dom"],
      },
    });
  },
};

export default config;
