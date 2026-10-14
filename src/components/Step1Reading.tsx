import {
  AlertCircle,
  ArrowRight,
  Clock,
  Headphones,
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

interface Step1ReadingProps {
  dyslexicMode: boolean;
  onCompleteStep1: (
    attempt: FluencyAttempt,
    alignment: AlignmentResult
  ) => void;
  onOpenSettings: () => void;
  studentName: string;
  text: ExerciseText;
}

export const Step1Reading: React.FC<Step1ReadingProps> = ({
  text,
  studentName,
  onCompleteStep1,
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

  // Initialisation du recorder
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

        // Appel à gemini-3.5-transcribe
        const transcription = await transcribeAudioWithGemini(
          audioBlob,
          text.tokens
        );
        // Alignement et calcul MCLM
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
          : "Erreur lors de la transcription. Vous pouvez réessayer ou simuler une lecture."
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
      setAnalysisError(
        "Impossible d'accéder au micro. Vérifiez les autorisations de votre navigateur."
      );
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  const handleSimulateReading = () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsAutoStopped(false);

    setTimeout(() => {
      const simulatedWords: TranscribedWord[] = [];
      const totalWords = text.tokens.length;
      const reachedCount = Math.min(
        totalWords,
        Math.max(35, Math.round(totalWords * 0.72))
      );

      let currentMs = 1200;
      for (let i = 0; i < reachedCount; i += 1) {
        const token = text.tokens[i];
        let spoken = token;

        if (i === 4) {
          spoken = token.length > 4 ? `${token.slice(0, -2)}e` : "mot";
        }
        if (i === 12) {
          currentMs += 3200;
        }

        simulatedWords.push({
          cleanText: spoken,
          endMs: currentMs + 450,
          startMs: currentMs,
          text: spoken,
        });

        currentMs += 520;
      }

      const result = alignFluencyReading(text.tokens, simulatedWords, {
        maxDurationMs: 60_000,
      });

      setAlignmentResult(result);
      setIsAnalyzing(false);
    }, 1200);
  };

  // Permet à l'enseignant de corriger un mot (ex: vrai positif pris pour une erreur ou inversement)
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
      onCompleteStep1(alignmentResult.attempt, alignmentResult);
    }
  };

  return (
    <div className="fade-in animate-in space-y-6 duration-300">
      {/* Alerte si les 60 secondes sont écoulées */}
      {isAutoStopped && (
        <div className="zoom-in-95 flex animate-in items-center justify-between gap-3 rounded-2xl bg-amber-500 px-5 py-3.5 font-bold text-slate-950 shadow-lg duration-200">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 shrink-0 text-slate-950" />
            <span className="text-sm">
              <strong>60 secondes écoulées !</strong> L’enregistrement s’est
              arrêté automatiquement.
            </span>
          </div>
          <span className="shrink-0 rounded-xl bg-slate-950 px-2.5 py-1 font-mono text-white text-xs">
            T = 60s
          </span>
        </div>
      )}

      {/* En-tête de l'étape 1 */}
      <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 md:flex-row">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 font-bold text-indigo-700 text-xs">
              Étape 1 sur 3
            </span>
            <span className="font-semibold text-slate-500 text-xs">
              Première lecture chronométrée
            </span>
          </div>
          <h2 className="font-extrabold font-fun text-2xl text-slate-900 sm:text-3xl">
            {text.title}
          </h2>
          <p className="mt-1 text-slate-600 text-xs sm:text-sm">
            À toi de jouer, {studentName} ! Lis le texte à voix haute pendant 60
            secondes. L’enregistrement s’arrête automatiquement à la fin du
            chrono !
          </p>
        </div>

        {/* Compteur chrono visuel avec anneau SVG */}
        <div className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
          <CircularTimer
            isRecording={isRecording}
            size={76}
            timeLeft={timeLeft}
            totalTime={60}
          />

          <div className="mx-1 h-12 w-px bg-slate-200" />

          {/* Bouton Enregistrement */}
          {alignmentResult && (
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 text-xs transition-colors hover:bg-slate-200"
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
              className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-rose-600 px-6 py-4 font-bold text-base text-white shadow-lg shadow-rose-200 transition-all hover:scale-105 hover:bg-rose-700"
              onClick={() => stopReading(false)}
              title="Arrêter avant les 60s si tu as fini de lire le texte"
              type="button"
            >
              <Square className="h-6 w-6 fill-white" />
              <span>Arrêter</span>
            </button>
          )}
          {!(alignmentResult || isRecording) && (
            <button
              className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-indigo-600 px-6 py-4 font-bold text-base text-white shadow-indigo-200 shadow-lg transition-all hover:scale-105 hover:bg-indigo-700 disabled:opacity-50"
              disabled={isAnalyzing}
              onClick={startReading}
              type="button"
            >
              <Mic className="h-6 w-6 animate-pulse-subtle" />
              <span>Commencer (60s)</span>
            </button>
          )}
        </div>
      </div>

      {/* Visualiseur audio pendant l'enregistrement */}
      {isRecording && (
        <div className="fade-in animate-in py-2 text-center">
          <p className="mb-2 font-semibold text-indigo-600 text-xs">
            Microphone actif · Parle à voix haute
          </p>
          <AudioVisualizer audioLevel={audioLevel} isRecording={isRecording} />
        </div>
      )}

      {/* Analyse en cours */}
      {isAnalyzing && (
        <div className="fade-in animate-in space-y-3 rounded-3xl border border-indigo-200 bg-indigo-50 p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
          <h3 className="font-bold font-fun text-indigo-950 text-lg">
            {isAutoStopped
              ? "60 secondes écoulées ! Analyse en cours..."
              : "Analyse de la lecture avec Gemini 3.5 Transcribe..."}
          </h3>
          <p className="mx-auto max-w-md text-indigo-700 text-xs">
            Détection verbatim des mots prononcés, des hésitations et calcul de
            la fluence selon une méthode inspirée du protocole ELFE.
          </p>
        </div>
      )}

      {/* Erreur */}
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
                Configurer la clé
              </button>
            )}
            <button
              className="cursor-pointer rounded-lg border border-rose-200 bg-white px-3 py-1 font-bold text-rose-900 transition-colors hover:bg-rose-100"
              onClick={handleSimulateReading}
              type="button"
            >
              Tester en mode démo
            </button>
          </div>
        </div>
      )}

      {/* Résultats de l'étape 1 */}
      {alignmentResult && (
        <div className="slide-in-from-bottom animate-in space-y-6 duration-300">
          <MclmGauge level={text.level} mclm={alignmentResult.mclm} />

          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-400 text-xs uppercase">
                Mots tentés
              </div>
              <div className="mt-1 font-bold font-fun text-2xl text-slate-800">
                {alignmentResult.wordsAttempted}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-400 text-xs uppercase">
                Mots justes (MCLM)
              </div>
              <div className="mt-1 font-bold font-fun text-2xl text-emerald-600">
                {alignmentResult.mclm}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-400 text-xs uppercase">
                Erreurs / Omissions
              </div>
              <div className="mt-1 font-bold font-fun text-2xl text-rose-600">
                {alignmentResult.errorsCount}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-400 text-xs uppercase">
                Mots à travailler
              </div>
              <div className="mt-1 font-bold font-fun text-2xl text-amber-600">
                {alignmentResult.attempt.stumbledWords.length}
              </div>
            </div>
          </div>

          {/* Lecteur audio de l'enregistrement de l'élève */}
          {recordedAudioUrl && (
            <AttemptAudioPlayer
              audioUrl={recordedAudioUrl}
              onSeekHandled={() => setSeekToTimeMs(null)}
              onTimeUpdate={(timeMs) => setPlaybackTimeMs(timeMs)}
              seekRequest={seekToTimeMs}
            />
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <Headphones className="h-4 w-4 text-indigo-600" />
              <span>
                Clique sur un mot ci-dessous pour sauter à son horodatage et
                vérifier la prononciation
              </span>
            </div>

            <button
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 font-bold text-sm text-white shadow-indigo-200 shadow-lg transition-all hover:scale-105 hover:bg-indigo-700"
              onClick={handleNext}
              type="button"
            >
              <span>Passer à l’étape 2 : Remédiation</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Affichage du texte de lecture avec repères cumulés et synchronisation audio */}
      <FluencyTextDisplay
        annotatedTokens={alignmentResult?.alignedTokens}
        content={text.content}
        dyslexicMode={dyslexicMode}
        onOverrideWordStatus={handleOverrideWordStatus}
        onSeekAudioMs={(startMs, endMs) => setSeekToTimeMs({ endMs, startMs })}
        playbackTimeMs={playbackTimeMs}
        showResults={Boolean(alignmentResult)}
      />

      {/* Raccourci de test en bas si pas encore d'analyse */}
      {!(alignmentResult || isRecording) && (
        <div className="pt-2 text-center">
          <button
            className="cursor-pointer font-medium text-slate-400 text-xs underline transition-colors hover:text-indigo-600"
            onClick={handleSimulateReading}
            type="button"
          >
            Tester rapidement sans micro (simulation de lecture élève)
          </button>
        </div>
      )}
    </div>
  );
};
