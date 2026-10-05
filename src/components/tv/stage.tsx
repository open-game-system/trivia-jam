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
 * The TV is one printed 1920x1080 poster, scaled to fit whatever it is cast to
 * (a 4K set, a 720p Chromecast, a laptop). Layout is authored once, in poster pixels.
 */
export const TvStage = ({ children }: { children: ReactNode }) => {
  const scale = useSyncExternalStore(subscribe, readScale, serverScale);
  return (
    <div className="riso tv-screen" data-testid="tv-stage">
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <defs>
          {/* Slightly rough ink edges on big shapes and display type. */}
          <filter id="tv-rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <pattern id="tv-dots-yellow" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r="4.6" fill="var(--yellow)" />
          </pattern>
          <pattern id="tv-dots-blue" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="2.6" fill="var(--blue)" />
          </pattern>
          <pattern id="tv-dots-pink" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="3.2" fill="var(--pink)" />
          </pattern>
        </defs>
      </svg>
      <div className="tv-sheet" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
};
