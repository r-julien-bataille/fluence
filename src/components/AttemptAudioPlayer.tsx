import { FastForward, Headphones, Pause, Play, Rewind } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface AttemptAudioPlayerProps {
  audioUrl: string | null;
  className?: string;
  onSeekHandled?: () => void;
  onTimeUpdate?: (currentTimeMs: number) => void;
  seekToTimeMs?: number | null;
}

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export const AttemptAudioPlayer: React.FC<AttemptAudioPlayerProps> = ({
  audioUrl,
  onTimeUpdate,
  seekToTimeMs,
  onSeekHandled,
  className = "",
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const isPlayingRef = useRef(isPlaying);
  const onSeekHandledRef = useRef(onSeekHandled);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    onSeekHandledRef.current = onSeekHandled;
  });

  // Gestion du saut vers un mot précis sélectionné par l'utilisateur
  useEffect(() => {
    if (
      seekToTimeMs !== null &&
      seekToTimeMs !== undefined &&
      audioRef.current
    ) {
      // 0.5s avant pour donner le contexte
      const targetSec = Math.max(0, seekToTimeMs / 1000 - 0.5);
      audioRef.current.currentTime = targetSec;
      setCurrentTimeSec(targetSec);
      if (!isPlayingRef.current) {
        audioRef.current
          ?.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error: unknown) => {
            console.debug("Audio play error", error);
          });
      }
      onSeekHandledRef.current?.();
    }
  }, [seekToTimeMs]);

  const togglePlay = async () => {
    if (!audioRef.current) {
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) {
      return;
    }
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
    const newSec = Number(e.target.value);
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
      const nextTime = Math.max(
        0,
        Math.min(durationSec, audioRef.current.currentTime + seconds)
      );
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

  if (!audioUrl) {
    return null;
  }

  return (
    <div
      className={`rounded-3xl border border-slate-800 bg-slate-900 p-4 text-white shadow-xl sm:p-5 ${className}`}
    >
      <audio
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        ref={audioRef}
        src={audioUrl}
      >
        <track kind="captions" />
      </audio>

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Titre et icône */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/20 text-indigo-400">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <span>Écoute de l’enregistrement de l’élève</span>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] text-indigo-300">
                Vérification humaine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Clique sur n’importe quel mot du texte pour écouter ce passage
              précis
            </p>
          </div>
        </div>

        {/* Contrôles de lecture */}
        <div className="flex items-center gap-2 self-center">
          <button
            className="cursor-pointer rounded-xl bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
            onClick={() => handleSkip(-3)}
            title="Reculer de 3 secondes"
            type="button"
          >
            <Rewind className="h-4 w-4" />
          </button>

          <button
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-indigo-600/30 shadow-lg transition-all hover:scale-105 hover:bg-indigo-500"
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Lecture"}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-white" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-white" />
            )}
          </button>

          <button
            className="cursor-pointer rounded-xl bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
            onClick={() => handleSkip(3)}
            title="Avancer de 3 secondes"
            type="button"
          >
            <FastForward className="h-4 w-4" />
          </button>

          {/* Vitesse de lecture */}
          <div className="ml-2 flex items-center gap-1 rounded-xl bg-slate-800 p-1">
            {[1, 0.8, 0.6].map((rate) => (
              <button
                className={`cursor-pointer rounded-lg px-2 py-1 font-bold text-[10px] transition-colors ${
                  playbackRate === rate
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                key={rate}
                onClick={() => changeSpeed(rate)}
                title={`Vitesse ${rate}x`}
                type="button"
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barre de défilement temporelle */}
      <div className="mt-4 flex items-center gap-3">
        <span className="w-10 text-right font-mono text-[11px] text-slate-400">
          {formatTime(currentTimeSec)}
        </span>

        <input
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
          max={durationSec || 60}
          min={0}
          onChange={handleSeekChange}
          step={0.1}
          type="range"
          value={currentTimeSec}
        />

        <span className="w-10 font-mono text-[11px] text-slate-400">
          {formatTime(durationSec || 60)}
        </span>
      </div>
    </div>
  );
};
