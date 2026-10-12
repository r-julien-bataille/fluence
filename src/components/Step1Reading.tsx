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
  RotateCcw,
  ArrowRight,
  AlertCircle,
  Loader2,
  Clock,
  Headphones,
} from 'lucide-react';

interface Step1ReadingProps {
  text: ExerciseText;
  studentName: string;
  onCompleteStep1: (attempt: FluencyAttempt, alignment: AlignmentResult) => void;
  onOpenSettings: () => void;
  dyslexicMode: boolean;
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
  const [alignmentResult, setAlignmentResult] = useState<AlignmentResult | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [playbackTimeMs, setPlaybackTimeMs] = useState<number>(0);
  const [seekToTimeMs, setSeekToTimeMs] = useState<number | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const stopReadingRef = useRef<(autoExpired?: boolean) => Promise<void>>(() => Promise.resolve());

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

        // Appel à gemini-3.5-transcribe
        const transcription = await transcribeAudioWithGemini(audioBlob, text.tokens);
        // Alignement et calcul MCLM
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
        err instanceof Error
          ? err.message
          : "Erreur lors de la transcription. Vous pouvez réessayer ou simuler une lecture."
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
      setAnalysisError("Impossible d'accéder au micro. Vérifiez les autorisations de votre navigateur.");
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
      const reachedCount = Math.min(totalWords, Math.max(35, Math.round(totalWords * 0.72)));

      let currentMs = 1200;
      for (let i = 0; i < reachedCount; i++) {
        const token = text.tokens[i];
        let spoken = token;

        if (i === 4) {
          spoken = token.length > 4 ? token.slice(0, -2) + 'e' : 'mot';
        }
        if (i === 12) {
          currentMs += 3200;
        }

        simulatedWords.push({
          text: spoken,
          cleanText: spoken,
          startMs: currentMs,
          endMs: currentMs + 450,
        });

        currentMs += 520;
      }

      const result = alignFluencyReading(text.tokens, simulatedWords, {
        maxDurationMs: 60000,
      });

      setAlignmentResult(result);
      setIsAnalyzing(false);
    }, 1200);
  };

  // Permet à l'enseignant de corriger un mot (ex: vrai positif pris pour une erreur ou inversement)
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
      onCompleteStep1(alignmentResult.attempt, alignmentResult);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alerte si les 60 secondes sont écoulées */}
      {isAutoStopped && (
        <div className="bg-amber-500 text-slate-950 font-bold px-5 py-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-slate-950 shrink-0" />
            <span className="text-sm">
              ⏳ <strong>60 secondes écoulées !</strong> L'enregistrement s'est arrêté automatiquement.
            </span>
          </div>
          <span className="text-xs bg-slate-950 text-white px-2.5 py-1 rounded-xl shrink-0 font-mono">
            T = 60s
          </span>
        </div>
      )}

      {/* En-tête de l'étape 1 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
              Étape 1 sur 3
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Première lecture chronométrée
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-fun">
            {text.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            À toi de jouer, {studentName} ! Lis le texte à voix haute pendant 60 secondes. L'enregistrement s'arrête automatiquement à la fin du chrono !
          </p>
        </div>

        {/* Compteur chrono visuel avec anneau SVG */}
        <div className="flex items-center gap-4 bg-slate-50 p-3 sm:p-4 rounded-3xl border border-slate-100">
          <CircularTimer
            timeLeft={timeLeft}
            totalTime={60}
            isRecording={isRecording}
            size={76}
          />

          <div className="w-px h-12 bg-slate-200 mx-1" />

          {/* Bouton Enregistrement */}
          {!alignmentResult ? (
            !isRecording ? (
              <button
                onClick={startReading}
                disabled={isAnalyzing}
                className="py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-200 flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
              >
                <Mic className="w-6 h-6 animate-pulse-subtle" />
                <span>Commencer (60s)</span>
              </button>
            ) : (
              <button
                onClick={() => stopReading(false)}
                className="py-4 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-rose-200 flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer"
                title="Arrêter avant les 60s si tu as fini de lire le texte"
              >
                <Square className="w-6 h-6 fill-white" />
                <span>Arrêter</span>
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
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recommencer</span>
            </button>
          )}
        </div>
      </div>

      {/* Visualiseur audio pendant l'enregistrement */}
      {isRecording && (
        <div className="text-center py-2 animate-in fade-in">
          <p className="text-xs font-semibold text-indigo-600 mb-2">Microphone actif · Parle à voix haute</p>
          <AudioVisualizer isRecording={isRecording} audioLevel={audioLevel} />
        </div>
      )}

      {/* Analyse en cours */}
      {isAnalyzing && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-8 text-center animate-in fade-in space-y-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-indigo-950 font-fun">
            {isAutoStopped ? "60 secondes écoulées ! Analyse en cours..." : "Analyse de la lecture avec Gemini 3.5 Transcribe..."}
          </h3>
          <p className="text-xs text-indigo-700 max-w-md mx-auto">
            Détection verbatim des mots prononcés, des hésitations et calcul de la fluence selon le protocole officiel ELFE.
          </p>
        </div>
      )}

      {/* Erreur */}
      {analysisError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{analysisError}</span>
          </div>
          <div className="flex items-center gap-2">
            {!hasStoredApiKey() && (
              <button
                onClick={onOpenSettings}
                className="underline font-bold text-rose-900"
              >
                Configurer la clé
              </button>
            )}
            <button
              onClick={handleSimulateReading}
              className="px-3 py-1 bg-white rounded-lg border border-rose-200 text-rose-900 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Tester en mode démo
            </button>
          </div>
        </div>
      )}

      {/* Résultats de l'étape 1 */}
      {alignmentResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          <MclmGauge
            mclm={alignmentResult.mclm}
            level={text.level}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="text-xs text-slate-400 font-semibold uppercase">Mots tentés</div>
              <div className="text-2xl font-bold text-slate-800 font-fun mt-1">
                {alignmentResult.wordsAttempted}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="text-xs text-slate-400 font-semibold uppercase">Mots justes (MCLM)</div>
              <div className="text-2xl font-bold text-emerald-600 font-fun mt-1">
                {alignmentResult.mclm}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="text-xs text-slate-400 font-semibold uppercase">Erreurs / Omissions</div>
              <div className="text-2xl font-bold text-rose-600 font-fun mt-1">
                {alignmentResult.errorsCount}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="text-xs text-slate-400 font-semibold uppercase">Mots à travailler</div>
              <div className="text-2xl font-bold text-amber-600 font-fun mt-1">
                {alignmentResult.attempt.stumbledWords.length}
              </div>
            </div>
          </div>

          {/* Lecteur audio de l'enregistrement de l'élève */}
          {recordedAudioUrl && (
            <AttemptAudioPlayer
              audioUrl={recordedAudioUrl}
              onTimeUpdate={(timeMs) => setPlaybackTimeMs(timeMs)}
              seekToTimeMs={seekToTimeMs}
              onSeekHandled={() => setSeekToTimeMs(null)}
            />
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-indigo-600" />
              <span>Clique sur un mot ci-dessous pour sauter à son horodatage et vérifier la prononciation</span>
            </div>

            <button
              onClick={handleNext}
              className="py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer shrink-0"
            >
              <span>Passer à l'étape 2 : Remédiation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Affichage du texte de lecture avec repères cumulés et synchronisation audio */}
      <FluencyTextDisplay
        content={text.content}
        annotatedTokens={alignmentResult?.alignedTokens}
        showResults={Boolean(alignmentResult)}
        dyslexicMode={dyslexicMode}
        playbackTimeMs={playbackTimeMs}
        onSeekAudioMs={(ms) => setSeekToTimeMs(ms)}
        onOverrideWordStatus={handleOverrideWordStatus}
      />

      {/* Raccourci de test en bas si pas encore d'analyse */}
      {!alignmentResult && !isRecording && (
        <div className="text-center pt-2">
          <button
            onClick={handleSimulateReading}
            className="text-xs text-slate-400 hover:text-indigo-600 underline font-medium transition-colors cursor-pointer"
          >
            Tester rapidement sans micro (simulation de lecture élève)
          </button>
        </div>
      )}
    </div>
  );
};
