import type React from "react";

interface AudioVisualizerProps {
  // 0 to 100
  audioLevel: number;
  isRecording: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  audioLevel,
}) => {
  // Simule ou anime 16 barres de niveau audio basées sur l'intensité du micro
  const bars = Array.from({ length: 18 });

  let barColor = "bg-slate-300";
  if (isRecording) {
    if (audioLevel > 50) {
      barColor = "bg-rose-500";
    } else if (audioLevel > 20) {
      barColor = "bg-indigo-500";
    } else {
      barColor = "bg-emerald-400";
    }
  }

  return (
    <div className="mx-auto flex h-12 max-w-xs items-center justify-center gap-1.5 rounded-2xl border border-slate-200/60 bg-slate-900/5 px-4 py-2 backdrop-blur-xs">
      {bars.map((_, i) => {
        // Variation ondulatoire autour du niveau audio global
        const distanceToCenter = Math.abs(i - 9) / 9;
        const barHeight = isRecording
          ? Math.max(
              12,
              Math.min(
                100,
                audioLevel * (1.2 - distanceToCenter * 0.7) +
                  Math.sin((i * Math.PI) / 4) * 15
              )
            )
          : 8;

        return (
          <div
            className={`w-1.5 rounded-full transition-all duration-75 ${barColor}`}
            key={i}
            style={{
              height: `${barHeight}%`,
            }}
          />
        );
      })}
    </div>
  );
};
