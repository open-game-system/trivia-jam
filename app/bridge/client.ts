import { createWebBridge } from "@open-game-system/app-bridge-web";
import { createBridgeContext } from "@open-game-system/app-bridge-react";
import type { AppStores } from "./types";

// Create and export the singleton web bridge instance
export const bridge = createWebBridge<AppStores>();

// Create and export the main bridge context
export const BridgeContext = createBridgeContext<AppStores>();
