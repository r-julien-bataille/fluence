import React from 'react';

interface CircularTimerProps {
  timeLeft: number;
  totalTime?: number;
  isRecording: boolean;
  size?: number;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  timeLeft,
  totalTime = 60,
  isRecording,
  size = 84,
}) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, timeLeft / totalTime));
  const strokeDashoffset = circumference * (1 - progress);

  const isCritical = timeLeft <= 10 && isRecording;
  const isWarning = timeLeft <= 20 && !isCritical && isRecording;

  let strokeColor = 'text-slate-300';
  let textColor = 'text-slate-800';

  if (isRecording) {
    if (isCritical) {
      strokeColor = 'text-rose-500';
      textColor = 'text-rose-600 animate-pulse';
    } else if (isWarning) {
      strokeColor = 'text-amber-500';
      textColor = 'text-amber-600';
    } else {
      strokeColor = 'text-indigo-600';
      textColor = 'text-indigo-600';
    }
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        className="w-full h-full -rotate-90 transform"
        viewBox="0 0 84 84"
        fill="none"
      >
        {/* Piste de fond */}
        <circle
          cx="42"
          cy="42"
          r={radius}
          className="stroke-slate-200"
          strokeWidth="6"
        />

        {/* Cercle de progression */}
        <circle
          cx="42"
          cy="42"
          r={radius}
          className={`transition-all duration-300 ease-linear ${strokeColor}`}
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>

      {/* Texte au centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-black font-fun tabular-nums leading-none ${textColor}`}>
          {timeLeft}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
          sec
        </span>
      </div>
    </div>
  );
};
