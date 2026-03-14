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
    // Remove Nitro and TanStack Start plugins that come from the project's
    // vite.config.ts — they break Storybook's preview build.
    const filteredPlugins = (config.plugins || []).filter((plugin) => {
      const name =
        (plugin as any)?.name ||
        (Array.isArray(plugin) ? (plugin[0] as any)?.name : "");
      return (
        !name.includes("nitro") &&
        !name.includes("tanstack") &&
        !name.includes("tsr")
      );
    });

    return mergeConfig(
      { ...config, plugins: filteredPlugins },
      {
        plugins: castKitStub ? [castKitStub] : [],
        resolve: {
          alias: {
            "~": path.resolve(__dirname, "../src"),
          },
          dedupe: ["react", "react-dom"],
        },
      }
    );
  },
};

export default config;
