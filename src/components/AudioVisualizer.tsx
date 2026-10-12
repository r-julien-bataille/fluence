import React from 'react';

interface AudioVisualizerProps {
  isRecording: boolean;
  audioLevel: number; // 0 to 100
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording, audioLevel }) => {
  // Simule ou anime 16 barres de niveau audio basées sur l'intensité du micro
  const bars = Array.from({ length: 18 });

  return (
    <div className="flex items-center justify-center gap-1.5 h-12 px-4 py-2 bg-slate-900/5 backdrop-blur-xs rounded-2xl border border-slate-200/60 max-w-xs mx-auto">
      {bars.map((_, i) => {
        // Variation ondulatoire autour du niveau audio global
        const distanceToCenter = Math.abs(i - 9) / 9;
        const barHeight = isRecording
          ? Math.max(
              12,
              Math.min(
                100,
                audioLevel * (1.2 - distanceToCenter * 0.7) + (Math.sin(Date.now() / 200 + i) * 15)
              )
            )
          : 8;

        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              isRecording
                ? audioLevel > 50
                  ? 'bg-rose-500'
                  : audioLevel > 20
                  ? 'bg-indigo-500'
                  : 'bg-emerald-400'
                : 'bg-slate-300'
            }`}
            style={{
              height: `${barHeight}%`,
            }}
          />
        );
      })}
    </div>
  );
};
