import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { atom } from "nanostores";
import { useState } from "react";
import { getDeviceType } from "~/utils/deviceType";
import { HomePageContent } from "~/components/homepage-content";

const loadIndex = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const gameId = crypto.randomUUID();
  const deviceType = getDeviceType(request.headers.get("user-agent"));
  return { gameId, deviceType };
});

export const Route = createFileRoute("/")({
  loader: async () => loadIndex(),
  component: Index,
});

function Index() {
  const { gameId, deviceType } = Route.useLoaderData();
  const [$showHelp] = useState(() => atom<boolean>(false));

  return (
    <HomePageContent
      newGameId={gameId}
      deviceType={deviceType}
      $showHelp={$showHelp}
    />
  );
}
