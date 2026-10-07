import { isOGSCastAvailable } from "@open-game-system/cast-kit-core";
import { CastProvider, useCastViewUrl } from "@open-game-system/cast-kit-react";
import { useMemo } from "react";

function DeclareTvPage({ tvUrl }: { tvUrl: string }) {
  useCastViewUrl(tvUrl);
  return null;
}

/**
 * Host phone inside the OGS app: tells the app which page is this game's TV (it forwards it to the
 * TV launcher as game.view). No cast button: OGS does the casting. Renders nothing in a plain browser.
 */
export function OgsTvUrl({ gameId }: { gameId: string }) {
  const inOgs = useMemo(() => typeof window !== "undefined" && isOGSCastAvailable(), []);
  if (!inOgs) return null;
  const tvUrl = `${window.location.origin}/spectate/${gameId}?stream=1`;
  return (
    <CastProvider>
      <DeclareTvPage tvUrl={tvUrl} />
    </CastProvider>
  );
}
