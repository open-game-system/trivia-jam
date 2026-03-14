import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";
import { mergeConfig } from "vite";

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
