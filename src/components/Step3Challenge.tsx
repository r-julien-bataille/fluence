import {
  AlertCircle,
  ArrowRight,
  Clock,
  Headphones,
  Loader2,
  Mic,
  RotateCcw,
  Square,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import type { ExerciseText, FluencyAttempt } from "@/db/db";
import type { AlignmentResult } from "@/lib/alignment";
import { alignFluencyReading } from "@/lib/alignment";
import { AudioRecorder } from "@/lib/audio/recorder";
import { playChimeSound } from "@/lib/audio/speech";
import { hasStoredApiKey } from "@/lib/gemini/client";
import type { TranscribedWord } from "@/lib/gemini/transcribe";
import { transcribeAudioWithGemini } from "@/lib/gemini/transcribe";

import { AttemptAudioPlayer } from "./AttemptAudioPlayer";
import { AudioVisualizer } from "./AudioVisualizer";
import { CircularTimer } from "./CircularTimer";
import { FluencyTextDisplay } from "./FluencyTextDisplay";
import { MclmGauge } from "./MclmGauge";

interface Step3ChallengeProps {
  attempt1: FluencyAttempt;
  dyslexicMode: boolean;
  onCompleteStep3: (
    attempt3: FluencyAttempt,
    alignment: AlignmentResult
  ) => void;
  onOpenSettings: () => void;
  studentName: string;
  text: ExerciseText;
}

export const Step3Challenge: React.FC<Step3ChallengeProps> = ({
  text,
  attempt1,
  studentName,
  onCompleteStep3,
  onOpenSettings,
  dyslexicMode,
}) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoStopped, setIsAutoStopped] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [alignmentResult, setAlignmentResult] =
    useState<AlignmentResult | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [playbackTimeMs, setPlaybackTimeMs] = useState<number>(0);
  const [seekToTimeMs, setSeekToTimeMs] = useState<{
    endMs?: number;
    startMs: number;
  } | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const stopReadingRef = useRef<(autoExpired?: boolean) => Promise<void>>(() =>
    Promise.resolve()
  );

  useEffect(() => {
    recorderRef.current = new AudioRecorder((level) => {
      setAudioLevel(level);
    });

    return () => {
      if (recorderRef.current) {
        recorderRef.current.abort();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const stopReading = async (autoExpired = false) => {
    if (!isRecordingRef.current) {
      return;
    }
    isRecordingRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (autoExpired) {
      setIsAutoStopped(true);
      playChimeSound();
    }

    setIsRecording(false);
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      if (recorderRef.current) {
        const audioBlob = await recorderRef.current.stop();
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);

        const transcription = await transcribeAudioWithGemini(
          audioBlob,
          text.tokens
        );
        const result = alignFluencyReading(text.tokens, transcription.words, {
          maxDurationMs: 60_000,
        });

        result.attempt.audioBlob = audioBlob;
        result.attempt.audioUrl = audioUrl;

        setAlignmentResult(result);
      }
    } catch (error: unknown) {
      console.error(error);
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Erreur de transcription audio."
      );
    }
    setIsAnalyzing(false);
  };

  useEffect(() => {
    stopReadingRef.current = stopReading;
  });

  const startReading = async () => {
    if (!hasStoredApiKey()) {
      setAnalysisError("Clé API Google requise pour l'évaluation vocale.");
      return;
    }

    setAnalysisError(null);
    setAlignmentResult(null);
    setRecordedAudioUrl(null);
    setIsAutoStopped(false);
    setTimeLeft(60);

    try {
      if (recorderRef.current) {
        await recorderRef.current.start();
        isRecordingRef.current = true;
        setIsRecording(true);

        timerRef.current = window.setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              stopReadingRef.current(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error: unknown) {
      console.error(error);
      setAnalysisError("Impossible d'accéder au microphone.");
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  const handleSimulateChallenge = () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsAutoStopped(false);

    setTimeout(() => {
      const simulatedWords: TranscribedWord[] = [];
      const totalWords = text.tokens.length;
      const reachedCount = Math.min(
        totalWords,
        Math.max(attempt1.wordsAttempted + 18, Math.round(totalWords * 0.88))
      );

      let currentMs = 1000;
      for (let i = 0; i < reachedCount; i += 1) {
        const token = text.tokens[i];
        simulatedWords.push({
          cleanText: token,
          endMs: currentMs + 380,
          startMs: currentMs,
          text: token,
        });
        currentMs += 420;
      }

      const result = alignFluencyReading(text.tokens, simulatedWords, {
        maxDurationMs: 60_000,
      });

      setAlignmentResult(result);
      setRecordedAudioUrl(
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
      );
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleOverrideWordStatus = (
    expectedIndexes: number[],
    newStatus: "correct" | "error"
  ) => {
    if (!alignmentResult) {
      return;
    }

    const updatedTokens = alignmentResult.alignedTokens.map((t) => {
      if (expectedIndexes.includes(t.expectedIndex)) {
        return {
          ...t,
          errorType:
            newStatus === "error" ? ("substitution" as const) : undefined,
          status: newStatus,
        };
      }
      return t;
    });

    let errorsCount = 0;
    for (const t of updatedTokens) {
      if (t.status === "error" || t.status === "hesitation") {
        errorsCount += 1;
      }
    }

    const mclm = Math.max(0, alignmentResult.wordsAttempted - errorsCount);

    const updatedResult: AlignmentResult = {
      ...alignmentResult,
      alignedTokens: updatedTokens,
      attempt: {
        ...alignmentResult.attempt,
        annotatedWords: updatedTokens.map((t) => ({
          expectedIndex: t.expectedIndex,
          spoken: t.spokenWord,
          status: t.status,
          timestampMs: t.timestampMs,
          word: t.expectedWord,
        })),
        errorsCount,
        mclm,
      },
      errorsCount,
      mclm,
    };

    setAlignmentResult(updatedResult);
  };

  const handleNext = () => {
    if (alignmentResult) {
      onCompleteStep3(alignmentResult.attempt, alignmentResult);
    }
  };

  const delta = alignmentResult ? alignmentResult.mclm - attempt1.mclm : null;

  return (
    <div className="fade-in animate-in space-y-6 duration-300">
      {/* Alerte si les 60 secondes sont écoulées */}
      {isAutoStopped && (
        <div className="zoom-in-95 flex animate-in items-center justify-between gap-3 rounded-2xl bg-amber-500 px-5 py-3.5 font-bold text-stone-950 shadow-lg duration-200">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 shrink-0 text-stone-950" />
            <span className="text-sm">
              <strong>60 secondes écoulées !</strong> Défi Record terminé,
              calcul du nouveau score en cours...
            </span>
          </div>
          <span className="shrink-0 rounded-xl bg-stone-950 px-2.5 py-1 font-mono text-white text-xs">
            T = 60s
          </span>
        </div>
      )}

      {/* En-tête de l'étape 3 */}
      <div className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl bg-linear-to-r from-primary-700 via-primary-700 to-primary-800 p-6 text-white shadow-xl sm:p-8 md:flex-row">
        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 font-extrabold text-stone-900 text-xs">
              <Trophy className="h-3.5 w-3.5" /> Étape 3 sur 3 : Défi Record
            </span>
            <span className="font-semibold text-primary-200 text-xs">
              Battre son premier score ({attempt1.mclm} MCLM)
            </span>
          </div>
          <h2 className="font-extrabold font-fun text-2xl sm:text-3xl">
            À toi de jouer pour le record !
          </h2>
          <p className="mt-1 max-w-lg text-primary-100 text-xs sm:text-sm">
            Applique ce que tu as appris sur les mots difficiles. Lis vite et
            avec précision ! L’enregistrement s’arrête automatiquement à 60s.
          </p>
        </div>

        {/* Compteur chrono visuel avec anneau SVG */}
        <div className="relative z-10 flex items-center gap-4 rounded-3xl border border-white/20 bg-paper/10 p-3 backdrop-blur-md sm:p-4">
          <CircularTimer
            isRecording={isRecording}
            size={76}
            timeLeft={timeLeft}
            totalTime={60}
          />

          <div className="mx-1 h-12 w-px bg-paper/20" />

          {alignmentResult && (
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-2xl bg-paper/20 px-4 py-3 font-semibold text-white text-xs transition-colors hover:bg-paper/30"
              onClick={() => {
                setAlignmentResult(null);
                setRecordedAudioUrl(null);
                setIsAutoStopped(false);
                setTimeLeft(60);
              }}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Recommencer</span>
            </button>
          )}
          {!alignmentResult && isRecording && (
            <button
              className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-rose-500 px-6 py-4 font-black text-base text-white shadow-lg transition-all hover:scale-105 hover:bg-rose-600"
              onClick={() => stopReading(false)}
              title="Arrêter avant les 60s"
              type="button"
            >
              <Square className="h-6 w-6 fill-white" />
              <span>Terminer</span>
            </button>
          )}
          {!(alignmentResult || isRecording) && (
            <button
              className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-amber-400 px-6 py-4 font-black text-base text-stone-950 shadow-amber-950/20 shadow-lg transition-all hover:scale-105 hover:bg-amber-300 disabled:opacity-50"
              disabled={isAnalyzing}
              onClick={startReading}
              type="button"
            >
              <Mic className="h-6 w-6 animate-pulse-subtle" />
              <span>Top Départ !</span>
            </button>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="fade-in animate-in py-2 text-center">
          <p className="mb-2 font-semibold text-primary-600 text-xs">
            Enregistrement en direct · Donne tout !
          </p>
          <AudioVisualizer audioLevel={audioLevel} isRecording={isRecording} />
        </div>
      )}

      {isAnalyzing && (
        <div className="fade-in animate-in space-y-3 rounded-3xl border border-primary-200 bg-primary-50 p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-600" />
          <h3 className="font-bold font-fun text-lg text-primary-950">
            {isAutoStopped
              ? "60 secondes écoulées ! Calcul de ton nouveau record..."
              : "Calcul de ton nouveau record de fluence..."}
          </h3>
          <p className="text-primary-700 text-xs">
            Comparaison entre la 1ère lecture et ton nouveau score.
          </p>
        </div>
      )}

      {analysisError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{analysisError}</span>
          </div>
          <div className="flex items-center gap-2">
            {!hasStoredApiKey() && (
              <button
                className="font-bold text-rose-900 underline"
                onClick={onOpenSettings}
                type="button"
              >
                Régler la clé
              </button>
            )}
            <button
              className="cursor-pointer rounded-lg border border-rose-200 bg-paper px-3 py-1 font-bold text-rose-900 transition-colors hover:bg-rose-100"
              onClick={handleSimulateChallenge}
              type="button"
            >
              Tester le record en mode démo
            </button>
          </div>
        </div>
      )}

      {/* Résultat du Défi Record */}
      {alignmentResult && (
        <div className="slide-in-from-bottom animate-in space-y-6 duration-300">
          <MclmGauge
            level={text.level}
            mclm={alignmentResult.mclm}
            previousMclm={attempt1.mclm}
            showComparison={true}
          />

          <div className="flex items-center justify-between rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 font-bold text-white text-xl shadow-md">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold font-fun text-emerald-950 text-lg">
                  Progression :{" "}
                  {delta !== null && delta > 0
                    ? `+${delta} mots par minute !`
                    : `${delta} MCLM`}
                </h4>
                <p className="text-emerald-700 text-xs">
                  {delta !== null && delta > 0
                    ? `Bravo ${studentName}, le travail sur les mots difficiles a payé !`
                    : "Bel effort ! La régularité de l’entraînement fait la différence."}
                </p>
              </div>
            </div>

            <button
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 font-bold text-sm text-white shadow-emerald-200 shadow-lg transition-all hover:scale-105 hover:bg-emerald-700"
              onClick={handleNext}
              type="button"
            >
              <span>Voir le Bilan & Victoire</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-stone-500 text-xs">
              <Headphones className="h-4 w-4 text-primary-600" />
              <span>
                Clique sur un mot ci-dessous pour sauter à son horodatage et
                vérifier la prononciation
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Zone du texte avec lecteur audio en sticky header */}
      <div className="space-y-4">
        {alignmentResult && recordedAudioUrl && (
          <div className="sticky top-[79px] z-30 bg-cream/95 py-2 backdrop-blur-sm">
            <AttemptAudioPlayer
              audioUrl={recordedAudioUrl}
              onSeekHandled={() => setSeekToTimeMs(null)}
              onTimeUpdate={(timeMs) => setPlaybackTimeMs(timeMs)}
              seekRequest={seekToTimeMs}
            />
          </div>
        )}

        <FluencyTextDisplay
          annotatedTokens={alignmentResult?.alignedTokens}
          content={text.content}
          dyslexicMode={dyslexicMode}
          onOverrideWordStatus={handleOverrideWordStatus}
          onSeekAudioMs={(startMs, endMs) =>
            setSeekToTimeMs({ endMs, startMs })
          }
          playbackTimeMs={playbackTimeMs}
          showResults={Boolean(alignmentResult)}
        />
      </div>

      {!(alignmentResult || isRecording) && (
        <div className="pt-2 text-center">
          <button
            className="cursor-pointer font-medium text-stone-400 text-xs underline transition-colors hover:text-primary-600"
            onClick={handleSimulateChallenge}
            type="button"
          >
            Tester rapidement le record sans micro (simulation)
          </button>
        </div>
      )}
    </div>
  );
};
