import { Cast, Loader2 } from "lucide-react";
import { CastKit } from "~/bridge/cast";

export function CastStatusIndicator() {
  const { isCasting, isConnecting } = CastKit.useStatus();
  const { devices } = CastKit.useDevices();

  const getStatusDetails = () => {
    if (isCasting) {
      return {
        text: "Connected to Cast Device",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
        textColor: "text-green-400",
        icon: <Cast className="w-4 h-4" />,
      };
    }

    if (isConnecting) {
      return {
        text: "Connecting to Cast...",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
        textColor: "text-yellow-400",
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
      };
    }

    if (devices.length > 0) {
      return {
        text: "Cast Available",
        bgColor: "bg-indigo-500/10",
        borderColor: "border-indigo-500/20",
        textColor: "text-indigo-400",
        icon: <Cast className="w-4 h-4" />,
      };
    }

    return null;
  };

  const status = getStatusDetails();

  if (!status) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        ${status.bgColor} ${status.borderColor} border
        ${status.textColor} font-medium text-sm
        shadow-sm
        transition-all duration-200 ease-in-out
      `}
    >
      {status.icon}
      <span>{status.text}</span>
    </div>
  );
}
