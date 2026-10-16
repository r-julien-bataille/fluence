import type React from "react";

interface CircularTimerProps {
  isRecording: boolean;
  size?: number;
  timeLeft: number;
  totalTime?: number;
  variant?: "default" | "inverse";
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  timeLeft,
  totalTime = 60,
  isRecording,
  size = 84,
  variant = "default",
}) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, timeLeft / totalTime));
  const strokeDashoffset = circumference * (1 - progress);

  const isCritical = timeLeft <= 10 && isRecording;
  const isWarning = timeLeft <= 20 && !isCritical && isRecording;
  const isInverse = variant === "inverse";

  let strokeColor = isInverse ? "text-white/40" : "text-stone-300";
  let textColor = isInverse ? "text-white" : "text-stone-800";
  const trackColor = isInverse ? "stroke-white/20" : "stroke-stone-200";
  const unitColor = isInverse ? "text-primary-100" : "text-stone-600";

  if (isRecording) {
    if (isCritical) {
      strokeColor = isInverse ? "text-rose-300" : "text-rose-500";
      textColor = isInverse
        ? "text-rose-200 animate-pulse"
        : "text-rose-600 animate-pulse";
    } else if (isWarning) {
      strokeColor = isInverse ? "text-amber-300" : "text-amber-500";
      textColor = isInverse ? "text-amber-200" : "text-amber-600";
    } else {
      strokeColor = isInverse ? "text-amber-300" : "text-primary-600";
      textColor = isInverse ? "text-white" : "text-primary-600";
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
          className={trackColor}
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
        <span
          className={`mt-0.5 font-bold text-[10px] uppercase tracking-tighter ${unitColor}`}
        >
          sec
        </span>
      </div>
    </div>
  );
};
