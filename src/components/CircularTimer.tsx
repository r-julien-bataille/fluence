import type React from "react";

interface CircularTimerProps {
  isRecording: boolean;
  size?: number;
  timeLeft: number;
  totalTime?: number;
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

  let strokeColor = "text-stone-300";
  let textColor = "text-stone-800";

  if (isRecording) {
    if (isCritical) {
      strokeColor = "text-rose-500";
      textColor = "text-rose-600 animate-pulse";
    } else if (isWarning) {
      strokeColor = "text-amber-500";
      textColor = "text-amber-600";
    } else {
      strokeColor = "text-primary-600";
      textColor = "text-primary-600";
    }
  }

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ height: size, width: size }}
    >
      <svg
        className="h-full w-full -rotate-90 transform"
        fill="none"
        viewBox="0 0 84 84"
      >
        <title>Minuteur circulaire</title>
        {/* Piste de fond */}
        <circle
          className="stroke-stone-200"
          cx="42"
          cy="42"
          r={radius}
          strokeWidth="6"
        />

        {/* Cercle de progression */}
        <circle
          className={`transition-all duration-300 ease-linear ${strokeColor}`}
          cx="42"
          cy="42"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth="6"
        />
      </svg>

      {/* Texte au centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-black font-fun text-2xl tabular-nums leading-none ${textColor}`}
        >
          {timeLeft}
        </span>
        <span className="mt-0.5 font-bold text-[10px] text-stone-400 uppercase tracking-tighter">
          sec
        </span>
      </div>
    </div>
  );
};
