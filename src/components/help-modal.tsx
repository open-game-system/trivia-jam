import { useStore } from "@nanostores/react";
import type { atom } from "nanostores";
import { Drawer } from "vaul";

type HelpModalProps = {
  $showHelp: ReturnType<typeof atom<boolean>>;
};

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <span className="prank" aria-hidden="true">
      {n}
    </span>
    <span className="pt-2 text-lg font-semibold leading-snug">{children}</span>
  </li>
);

/** "How to Play" as a printed sheet that slides up from the bottom. */
export function HelpModal({ $showHelp }: HelpModalProps) {
  const showHelp = useStore($showHelp);

  return (
    <Drawer.Root open={showHelp} onOpenChange={(open) => $showHelp.set(open)}>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-50"
          style={{ background: "rgba(30,27,26,0.55)" }}
        />
        <Drawer.Content
          className="psheet-drawer"
        >
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
            <div className="mx-auto mb-4 h-2 w-16 bg-ink" aria-hidden="true" />
            <div className="mx-auto max-w-xl">
              <Drawer.Title asChild>
                <h2 className="misreg mb-4 text-4xl font-extrabold">How to Play</h2>
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                How answering and scoring work
              </Drawer.Description>

              <h3 className="pslug mb-2" style={{ fontSize: 16 }}>
                Number questions
              </h3>
              <ol className="mb-5 space-y-3">
                <Step n={1}>Tap the number keys to type your guess.</Step>
                <Step n={2}>Tap GO to lock it in.</Step>
                <Step n={3}>The exact number wins the most points.</Step>
              </ol>

              <h3 className="pslug mb-2" style={{ fontSize: 16 }}>
                Choice questions
              </h3>
              <ol className="mb-5 space-y-3">
                <Step n={1}>Tap the colour you think is right.</Step>
                <Step n={2}>Right answers score 4, 3, 2, then 1 point, fastest first.</Step>
              </ol>

              <p className="mb-5 border-4 border-ink bg-yellow px-4 py-3 text-lg font-bold">
                Close counts: the three closest guesses score 4, 3 and 2.
              </p>

              <button
                type="button"
                onClick={() => $showHelp.set(false)}
                className="pbtn pbtn-pink pbtn-lg pbtn-block"
              >
                Got it!
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
