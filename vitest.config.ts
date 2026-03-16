import { defineConfig } from "vitest/config";
import path from "path";

const reactPath = path.resolve(__dirname, "node_modules/.pnpm/react@19.2.4/node_modules/react");
const reactDomPath = path.resolve(__dirname, "node_modules/.pnpm/react-dom@19.2.4_react@19.2.4/node_modules/react-dom");

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      // Force all packages (including symlinked OGS packages) to use
      // trivia-jam's React instance, avoiding dual React issues
      "react/jsx-runtime": path.resolve(reactPath, "jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(reactPath, "jsx-dev-runtime"),
      "react-dom/client": path.resolve(reactDomPath, "client"),
      "react-dom": reactDomPath,
      react: reactPath,
    },
    dedupe: ["react", "react-dom"],
    // Don't resolve "source" field for linked packages (causes dual React)
    mainFields: ["module", "main"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "e2e", "**/*.e2e.spec.{js,ts}", ".swarm", ".claude", ".stryker-tmp"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: ["node_modules/", "test/setup.ts"],
    },
  },
});
