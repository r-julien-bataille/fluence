import React, { useState, useEffect, useRef } from 'react';
import { ExerciseText, FluencyAttempt } from '@/db/db';
import { FluencyTextDisplay } from './FluencyTextDisplay';
import { AudioRecorder } from '@/lib/audio/recorder';
import { AudioVisualizer } from './AudioVisualizer';
import { AttemptAudioPlayer } from './AttemptAudioPlayer';
import { transcribeAudioWithGemini, TranscribedWord } from '@/lib/gemini/transcribe';
import { alignFluencyReading, AlignmentResult } from '@/lib/alignment';
import { MclmGauge } from './MclmGauge';
import { CircularTimer } from './CircularTimer';
import { hasStoredApiKey } from '@/lib/gemini/client';
import { playChimeSound } from '@/lib/audio/speech';
import {
  Mic,
  Square,
  Trophy,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  Loader2,
  TrendingUp,
  Clock,
  Headphones,
} from 'lucide-react';

interface Step3ChallengeProps {
  text: ExerciseText;
  attempt1: FluencyAttempt;
  studentName: string;
  onCompleteStep3: (attempt3: FluencyAttempt, alignment: AlignmentResult) => void;
  onOpenSettings: () => void;
  dyslexicMode: boolean;
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
  const [alignmentResult, setAlignmentResult] = useState<AlignmentResult | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [playbackTimeMs, setPlaybackTimeMs] = useState<number>(0);
  const [seekToTimeMs, setSeekToTimeMs] = useState<number | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const stopReadingRef = useRef<(autoExpired?: boolean) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    recorderRef.current = new AudioRecorder((level) => {
      setAudioLevel(level);
    });

    return () => {
      if (recorderRef.current) recorderRef.current.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopReading = async (autoExpired: boolean = false) => {
    if (!isRecordingRef.current) return;
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

        const transcription = await transcribeAudioWithGemini(audioBlob, text.tokens);
        const result = alignFluencyReading(text.tokens, transcription.words, {
          maxDurationMs: 60000,
        });

        result.attempt.audioBlob = audioBlob;
        result.attempt.audioUrl = audioUrl;

        setAlignmentResult(result);
      }
    } catch (err: unknown) {
      console.error(err);
      setAnalysisError(
        err instanceof Error ? err.message : "Erreur de transcription audio."
      );
    } finally {
      setIsAnalyzing(false);
    }
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
    } catch (err: unknown) {
      console.error(err);
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
      for (let i = 0; i < reachedCount; i++) {
        const token = text.tokens[i];
        simulatedWords.push({
          text: token,
          cleanText: token,
          startMs: currentMs,
          endMs: currentMs + 380,
        });
        currentMs += 420;
      }

      const result = alignFluencyReading(text.tokens, simulatedWords, {
        maxDurationMs: 60000,
      });

      setAlignmentResult(result);
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleOverrideWordStatus = (expectedIndex: number, newStatus: 'correct' | 'error') => {
    if (!alignmentResult) return;

    const updatedTokens = alignmentResult.alignedTokens.map((t) => {
      if (t.expectedIndex === expectedIndex) {
        return {
          ...t,
          status: newStatus,
          errorType: newStatus === 'error' ? ('substitution' as const) : undefined,
        };
      }
      return t;
    });

    let errorsCount = 0;
    for (const t of updatedTokens) {
      if (t.status === 'error' || t.status === 'hesitation') {
        errorsCount++;
      }
    }
    const mclm = Math.max(0, alignmentResult.wordsAttempted - errorsCount);

    const updatedResult: AlignmentResult = {
      ...alignmentResult,
      alignedTokens: updatedTokens,
      errorsCount,
      mclm,
      attempt: {
        ...alignmentResult.attempt,
        errorsCount,
        mclm,
        annotatedWords: updatedTokens.map((t) => ({
          expectedIndex: t.expectedIndex,
          word: t.expectedWord,
          status: t.status,
          spoken: t.spokenWord,
          timestampMs: t.timestampMs,
        })),
      },
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alerte si les 60 secondes sont écoulées */}
      {isAutoStopped && (
        <div className="bg-amber-500 text-slate-950 font-bold px-5 py-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-slate-950 shrink-0" />
            <span className="text-sm">
              ⏳ <strong>60 secondes écoulées !</strong> Défi Record terminé, calcul du nouveau score en cours...
            </span>
          </div>
          <span className="text-xs bg-slate-950 text-white px-2.5 py-1 rounded-xl shrink-0 font-mono">
            T = 60s
          </span>
        </div>
      )}

      {/* En-tête de l'étape 3 */}
      <div className="bg-linear-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 font-extrabold text-xs flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Étape 3 sur 3 : Défi Record
            </span>
            <span className="text-xs text-indigo-200 font-semibold">
              Battre son premier score ({attempt1.mclm} MCLM)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-fun">
            À toi de jouer pour le record !
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-lg">
            Applique ce que tu as appris sur les mots difficiles. Lis vite et avec précision ! L'enregistrement s'arrête automatiquement à 60s.
          </p>
        </div>

        {/* Compteur chrono visuel avec anneau SVG */}
        <div className="relative z-10 flex items-center gap-4 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-white/20">
          <CircularTimer
            timeLeft={timeLeft}
            totalTime={60}
            isRecording={isRecording}
            size={76}
          />

          <div className="w-px h-12 bg-white/20 mx-1" />

          {!alignmentResult ? (
            !isRecording ? (
              <button
                onClick={startReading}
                disabled={isAnalyzing}
                className="py-4 px-6 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl font-black text-base shadow-lg shadow-amber-950/20 flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
              >
                <Mic className="w-6 h-6 animate-pulse-subtle" />
                <span>Top Départ !</span>
              </button>
            ) : (
              <button
                onClick={() => stopReading(false)}
                className="py-4 px-6 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-base shadow-lg flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer"
                title="Arrêter avant les 60s"
              >
                <Square className="w-6 h-6 fill-white" />
                <span>Terminer</span>
              </button>
            )
          ) : (
            <button
              onClick={() => {
                setAlignmentResult(null);
                setRecordedAudioUrl(null);
                setIsAutoStopped(false);
                setTimeLeft(60);
              }}
              className="py-3 px-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recommencer</span>
            </button>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="text-center py-2 animate-in fade-in">
          <p className="text-xs font-semibold text-indigo-600 mb-2">Enregistrement en direct · Donne tout !</p>
          <AudioVisualizer isRecording={isRecording} audioLevel={audioLevel} />
        </div>
      )}

      {isAnalyzing && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-8 text-center animate-in fade-in space-y-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-indigo-950 font-fun">
            {isAutoStopped ? "60 secondes écoulées ! Calcul de ton nouveau record..." : "Calcul de ton nouveau record de fluence..."}
          </h3>
          <p className="text-xs text-indigo-700">
            Comparaison entre la 1ère lecture et ton nouveau score.
          </p>
        </div>
      )}

      {analysisError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{analysisError}</span>
          </div>
          <div className="flex items-center gap-2">
            {!hasStoredApiKey() && (
              <button onClick={onOpenSettings} className="underline font-bold text-rose-900">
                Régler la clé
              </button>
            )}
            <button
              onClick={handleSimulateChallenge}
              className="px-3 py-1 bg-white rounded-lg border border-rose-200 text-rose-900 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Tester le record en mode démo
            </button>
          </div>
        </div>
      )}

      {/* Résultat du Défi Record */}
      {alignmentResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          <MclmGauge
            mclm={alignmentResult.mclm}
            level={text.level}
            previousMclm={attempt1.mclm}
            showComparison={true}
          />

          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-emerald-950 font-fun">
                  Progression : {delta !== null && delta > 0 ? `+${delta} mots par minute ! 🚀` : `${delta} MCLM`}
                </h4>
                <p className="text-xs text-emerald-700">
                  {delta !== null && delta > 0
                    ? `Bravo ${studentName}, le travail sur les mots difficiles a payé !`
                    : "Bel effort ! La régularité de l'entraînement fait la différence."}
                </p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer shrink-0"
            >
              <span>Voir le Bilan & Victoire</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Lecteur audio de l'enregistrement du Défi Record */}
          {recordedAudioUrl && (
            <AttemptAudioPlayer
              audioUrl={recordedAudioUrl}
              onTimeUpdate={(timeMs) => setPlaybackTimeMs(timeMs)}
              seekToTimeMs={seekToTimeMs}
              onSeekHandled={() => setSeekToTimeMs(null)}
            />
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-indigo-600" />
              <span>Clique sur un mot ci-dessous pour sauter à son horodatage et vérifier la prononciation</span>
            </div>
          </div>
        </div>
      )}

      <FluencyTextDisplay
        content={text.content}
        annotatedTokens={alignmentResult?.alignedTokens}
        showResults={Boolean(alignmentResult)}
        dyslexicMode={dyslexicMode}
        playbackTimeMs={playbackTimeMs}
        onSeekAudioMs={(ms) => setSeekToTimeMs(ms)}
        onOverrideWordStatus={handleOverrideWordStatus}
      />

      {!alignmentResult && !isRecording && (
        <div className="text-center pt-2">
          <button
            onClick={handleSimulateChallenge}
            className="text-xs text-slate-400 hover:text-indigo-600 underline font-medium transition-colors cursor-pointer"
          >
            Tester rapidement le record sans micro (simulation)
          </button>
        </div>
      )}
    </div>
  );
};
