import { Cast, Loader2 } from "lucide-react";
import { CastKit } from "~/bridge/cast";

export function CastButton() {
  const state = CastKit.useState();
  const { signalReady, stopCasting } = CastKit.useSend();

  if (!state.isAvailable && state.devices.length === 0) {
    return null;
  }

  const handleClick = () => {
    if (state.isCasting) {
      stopCasting();
    } else if (state.isAvailable) {
      signalReady({ gameId: "trivia-jam" });
    }
  };

  let IconComponent = Cast;
  let buttonClass =
    "inline-flex items-center gap-2 p-2 rounded-lg transition-all duration-200";
  let title = "Cast not available";
  let isDisabled = true;
  let statusText: string | null = null;

  if (state.isCasting) {
    buttonClass =
      "inline-flex items-center gap-2 p-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all duration-200";
    title = "Connected to Cast - Click to disconnect";
    statusText = "Connected";
    isDisabled = false;
  } else if (state.isConnecting) {
    IconComponent = Loader2;
    buttonClass =
      "inline-flex items-center gap-2 p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 animate-pulse transition-all duration-200";
    title = "Connecting to Cast device...";
    statusText = "Connecting";
    isDisabled = true;
  } else if (state.isAvailable) {
    buttonClass =
      "inline-flex items-center gap-2 p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-all duration-200";
    title = "Cast to device";
    statusText = "Available";
    isDisabled = false;
  } else {
    buttonClass =
      "inline-flex items-center gap-2 p-2 rounded-lg bg-gray-900/30 border border-gray-700/30 text-gray-600 cursor-not-allowed transition-all duration-200";
    title = "No Cast devices found";
    isDisabled = true;
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={buttonClass}
      title={title}
      aria-label={title}
    >
      <IconComponent
        className={`w-5 h-5 ${IconComponent === Loader2 ? "animate-spin" : ""}`}
      />
      {statusText && <span className="text-sm font-medium">{statusText}</span>}
    </button>
  );
}
