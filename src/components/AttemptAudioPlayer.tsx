import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FastForward,
  Rewind,
  Headphones,
} from 'lucide-react';

interface AttemptAudioPlayerProps {
  audioUrl: string | null;
  onTimeUpdate?: (currentTimeMs: number) => void;
  seekToTimeMs?: number | null;
  onSeekHandled?: () => void;
  className?: string;
}

export const AttemptAudioPlayer: React.FC<AttemptAudioPlayerProps> = ({
  audioUrl,
  onTimeUpdate,
  seekToTimeMs,
  onSeekHandled,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Gestion du saut vers un mot précis sélectionné par l'utilisateur
  useEffect(() => {
    if (seekToTimeMs !== null && seekToTimeMs !== undefined && audioRef.current) {
      const targetSec = Math.max(0, seekToTimeMs / 1000 - 0.5); // 0.5s avant pour donner le contexte
      audioRef.current.currentTime = targetSec;
      setCurrentTimeSec(targetSec);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      if (onSeekHandled) onSeekHandled();
    }
  }, [seekToTimeMs]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    setCurrentTimeSec(cur);
    if (onTimeUpdate) {
      onTimeUpdate(Math.round(cur * 1000));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDurationSec(audioRef.current.duration || 60);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSec = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newSec;
      setCurrentTimeSec(newSec);
      if (onTimeUpdate) {
        onTimeUpdate(Math.round(newSec * 1000));
      }
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      const nextTime = Math.max(0, Math.min(durationSec, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = nextTime;
      setCurrentTimeSec(nextTime);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!audioUrl) return null;

  return (
    <div
      className={`bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-800 ${className}`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Titre et icône */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Écoute de l'enregistrement de l'élève</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Vérification humaine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Clique sur n'importe quel mot du texte pour écouter ce passage précis
            </p>
          </div>
        </div>

        {/* Contrôles de lecture */}
        <div className="flex items-center gap-2 self-center">
          <button
            onClick={() => handleSkip(-3)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Reculer de 3 secondes"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all cursor-pointer"
            title={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </button>

          <button
            onClick={() => handleSkip(3)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Avancer de 3 secondes"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Vitesse de lecture */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl ml-2">
            {[1.0, 0.8, 0.6].map((rate) => (
              <button
                key={rate}
                onClick={() => changeSpeed(rate)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Vitesse ${rate}x`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barre de défilement temporelle */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
          {formatTime(currentTimeSec)}
        </span>

        <input
          type="range"
          min={0}
          max={durationSec || 60}
          step={0.1}
          value={currentTimeSec}
          onChange={handleSeekChange}
          className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />

        <span className="text-[11px] font-mono text-slate-400 w-10">
          {formatTime(durationSec || 60)}
        </span>
      </div>
    </div>
  );
};
