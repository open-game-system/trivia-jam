import React from 'react';
import { useCastSession, useCastAvailable } from '@open-game-system/cast-kit-react';
import { Cast, Loader2 } from 'lucide-react';

export function CastStatusIndicator() {
  const session = useCastSession();
  const isAvailable = useCastAvailable();

  const getStatusDetails = () => {
    if (session.status === 'connected') {
      return {
        text: 'Connected to Cast Device',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        textColor: 'text-green-400',
        icon: <Cast className="w-4 h-4" />
      };
    }

    if (session.status === 'connecting') {
      return {
        text: 'Connecting to Cast...',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        textColor: 'text-yellow-400',
        icon: <Loader2 className="w-4 h-4 animate-spin" />
      };
    }

    if (isAvailable) {
      return {
        text: 'Cast Available',
        bgColor: 'bg-indigo-500/10',
        borderColor: 'border-indigo-500/20',
        textColor: 'text-indigo-400',
        icon: <Cast className="w-4 h-4" />
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
