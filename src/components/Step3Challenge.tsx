import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Mic,
  RotateCcw,
  Square,
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
      setAnalysisError(
        "Ajoutez votre clé Google Gemini dans les réglages ou utilisez le mode démo."
      );
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
    }, 800);
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

  const hesitationsCount =
    alignmentResult?.alignedTokens.filter((t) => t.status === "hesitation")
      .length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-paper px-4 py-3 sm:px-5">
        <div>
          <h1 className="font-bold font-fun text-stone-900 text-xl sm:text-2xl">
            {text.title}
          </h1>
          <p className="text-stone-600 text-xs">
            2e lecture chronométrée (60s) · Score à battre :{" "}
            <strong className="font-bold text-stone-800">
              {attempt1.mclm} MCLM
            </strong>{" "}
            ({studentName})
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!alignmentResult && (
            <CircularTimer
              isRecording={isRecording}
              size={52}
              timeLeft={timeLeft}
              totalTime={60}
            />
          )}

          {alignmentResult && (
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-cream/60 px-3 py-2 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream"
              onClick={() => {
                setAlignmentResult(null);
                setRecordedAudioUrl(null);
                setIsAutoStopped(false);
                setTimeLeft(60);
              }}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refaire le défi</span>
            </button>
          )}

          {!alignmentResult && isRecording && (
            <button
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 font-bold text-sm text-white transition-colors hover:bg-rose-700"
              onClick={() => stopReading(false)}
              title="Arrêter l'enregistrement"
              type="button"
            >
              <Square className="h-4 w-4 fill-white" />
              <span>Arrêter</span>
            </button>
          )}

          {!(alignmentResult || isRecording) && (
            <div className="flex items-center gap-2">
              <button
                className="cursor-pointer rounded-lg border border-stone-200 bg-cream/60 px-2.5 py-2 font-semibold text-stone-600 text-xs transition-colors hover:bg-cream hover:text-stone-900"
                disabled={isAnalyzing}
                onClick={handleSimulateChallenge}
                title="Simuler une 2e lecture sans microphone"
                type="button"
              >
                Démo
              </button>
              <button
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 font-bold text-sm text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                disabled={isAnalyzing}
                onClick={startReading}
                type="button"
              >
                <Mic className="h-4 w-4" />
                <span>Lancer le défi (60s)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-2">
          <span className="font-semibold text-primary-800 text-xs">
            Microphone actif
          </span>
          <AudioVisualizer audioLevel={audioLevel} isRecording={isRecording} />
        </div>
      )}

      {isAnalyzing && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-primary-900 text-xs">
          <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
          <span className="font-semibold">
            {isAutoStopped
              ? "60 secondes écoulées — calcul du nouveau score..."
              : "Calcul du nouveau score de fluence..."}
          </span>
        </div>
      )}

      {analysisError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-rose-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{analysisError}</span>
          </div>
          <div className="flex items-center gap-2">
            {!hasStoredApiKey() && (
              <button
                className="cursor-pointer font-bold text-rose-900 underline"
                onClick={onOpenSettings}
                type="button"
              >
                Configurer la clé
              </button>
            )}
            <button
              className="cursor-pointer rounded-lg border border-rose-200 bg-paper px-2.5 py-1 font-bold text-rose-900 hover:bg-rose-100"
              onClick={handleSimulateChallenge}
              type="button"
            >
              Simuler le défi
            </button>
          </div>
        </div>
      )}

      {alignmentResult && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-paper px-4 py-3 sm:px-5">
          <MclmGauge
            errorsCount={alignmentResult.errorsCount}
            hesitationsCount={hesitationsCount}
            level={text.level}
            mclm={alignmentResult.mclm}
            previousMclm={attempt1.mclm}
            wordsAttempted={alignmentResult.wordsAttempted}
          />

          <button
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white text-xs transition-colors hover:bg-emerald-700 sm:text-sm"
            onClick={handleNext}
            type="button"
          >
            <span>Voir le bilan</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {alignmentResult && recordedAudioUrl && (
          <div className="sticky top-14 z-30 bg-cream/95 py-1.5 backdrop-blur-sm">
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
    </div>
  );
};
