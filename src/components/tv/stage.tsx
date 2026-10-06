import { type ReactNode, useSyncExternalStore } from "react";

export const TV_WIDTH = 1920;
export const TV_HEIGHT = 1080;

const subscribe = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const readScale = () => Math.min(window.innerWidth / TV_WIDTH, window.innerHeight / TV_HEIGHT);
const serverScale = () => 1;

/**
 * The TV is one 1920x1080 stage on the aurora, scaled to fit whatever it is cast to
 * (a 4K set, a 720p Chromecast, a laptop). Layout is authored once, in stage pixels.
 */
export const TvStage = ({ children }: { children: ReactNode }) => {
  const scale = useSyncExternalStore(subscribe, readScale, serverScale);
  return (
    <div className="aurora tv-screen" data-testid="tv-stage">
      <div className="tv-sheet" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
};
