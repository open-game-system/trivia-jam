import type { CastState, CastEvents } from "@open-game-system/cast-kit-core";

// Define AppStores type using the new cast-kit-core types
export type AppStores = {
  cast: {
    state: CastState;
    events: CastEvents;
  };
};

// Re-export for convenience
export type { CastState, CastEvents };
