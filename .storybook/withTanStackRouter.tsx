import React from "react";
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createMemoryHistory,
} from "@tanstack/react-router";

export const withTanStackRouter = (Story: React.ComponentType, context: any) => {
  const rootRoute = createRootRoute({
    component: Story,
  });

  const initialEntries = context?.parameters?.router?.initialEntries || ["/"];
  const memoryHistory = createMemoryHistory({
    initialEntries,
  });

  const router = createRouter({
    routeTree: rootRoute,
    history: memoryHistory,
  });

  return <RouterProvider router={router} />;
};
