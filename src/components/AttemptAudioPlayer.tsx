import { FastForward, Headphones, Pause, Play, Rewind } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface AttemptAudioPlayerProps {
  audioUrl: string | null;
  className?: string;
  onSeekHandled?: () => void;
  onTimeUpdate?: (currentTimeMs: number) => void;
  seekRequest?: { endMs?: number; startMs: number } | null;
}

// Lecture strictement à partir du début du mot (aucun mot précédent),
// et arrêt quelques secondes après la fin du mot pour une écoute plus naturelle.
const WORD_END_PADDING_SEC = 0.5;
const MAX_DURATION_SEC = 60;
const DEFAULT_WORD_DURATION_SEC = 0.7;

const formatTime = (rawSec: number) => {
  const sec = Number.isFinite(rawSec) ? rawSec : 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export const AttemptAudioPlayer: React.FC<AttemptAudioPlayerProps> = ({
  audioUrl,
  onTimeUpdate,
  seekRequest,
  onSeekHandled,
  className = "",
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const stopAtSecRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const onSeekHandledRef = useRef(onSeekHandled);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    onSeekHandledRef.current = onSeekHandled;
  });

  // Lecture isolée du mot sélectionné : on joue du début à la fin du mot, puis pause (0,5 s après la fin du mot)
  useEffect(() => {
    const audio = audioRef.current;
    if (!(seekRequest && audio)) {
      return;
    }
    const startSec = seekRequest.startMs / 1000;
    stopAtSecRef.current =
      seekRequest.endMs === undefined
        ? startSec + DEFAULT_WORD_DURATION_SEC + WORD_END_PADDING_SEC
        : seekRequest.endMs / 1000 + WORD_END_PADDING_SEC;
    audio.currentTime = startSec;
    setCurrentTimeSec(startSec);
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((error: unknown) => {
        console.debug("Audio play error", error);
      });
    onSeekHandledRef.current?.();
  }, [seekRequest]);

  // Arrêt précis à la fin du mot (timeupdate est trop espacé)
  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const id = window.setInterval(() => {
      const audio = audioRef.current;
      const stopAt = stopAtSecRef.current;
      if (audio && stopAt !== null && audio.currentTime >= stopAt) {
        audio.pause();
        stopAtSecRef.current = null;
        setIsPlaying(false);
      }
    }, 30);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const togglePlay = async () => {
    if (!audioRef.current) {
      return;
    }
    stopAtSecRef.current = null;
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

  const applyDuration = (audio: HTMLAudioElement) => {
    const { duration } = audio;
    setDurationSec(
      Number.isFinite(duration) && duration > 0
        ? Math.min(duration, MAX_DURATION_SEC)
        : MAX_DURATION_SEC
    );
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (Number.isFinite(audio.duration)) {
      applyDuration(audio);
      return;
    }
    // Les enregistrements MediaRecorder (webm) annoncent une durée « Infinity » :
    // un saut à la fin force le navigateur à calculer la vraie durée.
    const onDurationResolved = () => {
      audio.removeEventListener("timeupdate", onDurationResolved);
      audio.currentTime = 0;
      applyDuration(audio);
    };
    audio.addEventListener("timeupdate", onDurationResolved);
    audio.currentTime = Number.MAX_SAFE_INTEGER;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopAtSecRef.current = null;
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
    stopAtSecRef.current = null;
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
      className={`rounded-3xl border border-stone-800 bg-stone-900 p-4 text-white shadow-xl sm:p-5 ${className}`}
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary-500/30 bg-primary-500/20 text-primary-400">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <span>Écoute de l’enregistrement de l’élève</span>
              <span className="rounded-full border border-primary-500/30 bg-primary-500/20 px-2 py-0.5 font-mono text-[10px] text-primary-300">
                Vérification humaine
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Clique sur n’importe quel mot du texte pour écouter ce passage
              précis
            </p>
          </div>
        </div>

        {/* Contrôles de lecture */}
        <div className="flex items-center gap-2 self-center">
          <button
            className="cursor-pointer rounded-xl bg-stone-800 p-2 text-stone-300 transition-colors hover:bg-stone-700"
            onClick={() => handleSkip(-3)}
            title="Reculer de 3 secondes"
            type="button"
          >
            <Rewind className="h-4 w-4" />
          </button>

          <button
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105 hover:bg-primary-500"
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
            className="cursor-pointer rounded-xl bg-stone-800 p-2 text-stone-300 transition-colors hover:bg-stone-700"
            onClick={() => handleSkip(3)}
            title="Avancer de 3 secondes"
            type="button"
          >
            <FastForward className="h-4 w-4" />
          </button>

          {/* Vitesse de lecture */}
          <div className="ml-2 flex items-center gap-1 rounded-xl bg-stone-800 p-1">
            {[1, 0.8, 0.6].map((rate) => (
              <button
                className={`cursor-pointer rounded-lg px-2 py-1 font-bold text-[10px] transition-colors ${
                  playbackRate === rate
                    ? "bg-primary-600 text-white"
                    : "text-stone-400 hover:text-white"
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
        <span className="w-10 text-right font-mono text-[11px] text-stone-400">
          {formatTime(currentTimeSec)}
        </span>

        <input
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-stone-800 accent-primary-500"
          max={durationSec || MAX_DURATION_SEC}
          min={0}
          onChange={handleSeekChange}
          step={0.1}
          type="range"
          value={currentTimeSec}
        />

        <span className="w-10 font-mono text-[11px] text-stone-400">
          {formatTime(durationSec || MAX_DURATION_SEC)}
        </span>
      </div>
    </div>
  );
};
