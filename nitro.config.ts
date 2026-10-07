import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  compatibilityDate: "2024-09-25",
  preset: "cloudflare_module",
  scanDirs: ["./server"],
  hooks: {
    // Nitro always registers <root>/assets as server assets and bundles it into the Worker. Here assets/
    // holds art/audio sources and the spend ledger (ai-art-assets convention), none of it server data.
    "rollup:before"(nitro) {
      nitro.options.serverAssets = nitro.options.serverAssets.filter((a) => a.baseName !== "server");
    },
  },
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
  },
});
