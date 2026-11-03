import {
  ArrowRight,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

import type { ExerciseText, FluencyAttempt } from "@/db/db";
import {
  pauseFrenchSpeech,
  resumeFrenchSpeech,
  speakFrenchText,
  stopFrenchSpeech,
} from "@/lib/audio/speech";

import { Flashcard } from "./Flashcard";
import { FluencyTextDisplay } from "./FluencyTextDisplay";

interface Step2RemediationProps {
  attempt1: FluencyAttempt;
  dyslexicMode: boolean;
  onReadyForStep3: () => void;
  text: ExerciseText;
}

type AudioPlayState = "idle" | "playing" | "paused";

export const Step2Remediation: React.FC<Step2RemediationProps> = ({
  text,
  attempt1,
  onReadyForStep3,
  dyslexicMode,
}) => {
  const stumbledWords = attempt1.stumbledWords || [];
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());
  const [revealedQuestions, setRevealedQuestions] = useState<Set<number>>(
    new Set()
  );
  const [audioState, setAudioState] = useState<AudioPlayState>("idle");

  useEffect(
    () => () => {
      stopFrenchSpeech();
    },
    []
  );

  const handleToggleMastered = (word: string) => {
    setMasteredWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  };

  const handleToggleQuestion = (index: number) => {
    setRevealedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleStartFullSpeech = async () => {
    setAudioState("playing");
    await speakFrenchText(text.content, {
      onEnd: () => {
        setAudioState("idle");
      },
      onError: () => {
        setAudioState("idle");
      },
      rate: 0.82,
    });
  };

  const handlePauseSpeech = () => {
    pauseFrenchSpeech();
    setAudioState("paused");
  };

  const handleResumeSpeech = () => {
    resumeFrenchSpeech();
    setAudioState("playing");
  };

  const handleStopSpeech = () => {
    stopFrenchSpeech();
    setAudioState("idle");
  };

  const handleProceedToStep3 = () => {
    stopFrenchSpeech();
    onReadyForStep3();
  };

  return (
    <div className="space-y-6">
      <div className="bg-paper flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 px-4 py-3 sm:px-5">
        <div>
          <h1 className="font-fun text-xl font-bold text-stone-900 sm:text-2xl">
            Entraînement sans chronomètre
          </h1>
          <p className="text-xs text-stone-600">
            {stumbledWords.length > 0
              ? `${stumbledWords.length} mot${stumbledWords.length > 1 ? "s" : ""} à retravailler (${masteredWords.size}/${stumbledWords.length} validé${masteredWords.size > 1 ? "s" : ""})`
              : "Aucun mot difficile détecté — relis le texte à ton rythme"}
          </p>
        </div>

        <button
          className="bg-primary-600 hover:bg-primary-700 flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors sm:text-sm"
          onClick={handleProceedToStep3}
          type="button"
        >
          <span>Lancer le défi (60s)</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {stumbledWords.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stumbledWords.map((word) => (
            <Flashcard
              isMastered={masteredWords.has(word)}
              key={word}
              onMastered={handleToggleMastered}
              word={word}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-fun text-base font-bold text-stone-900">
            Relecture complète
          </h2>

          <div className="flex items-center gap-1.5">
            {audioState === "idle" && (
              <button
                className="bg-paper hover:bg-cream flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors"
                onClick={handleStartFullSpeech}
                type="button"
              >
                <Volume2 className="text-primary-600 h-3.5 w-3.5" />
                <span>Écouter la lecture modèle</span>
              </button>
            )}
            {audioState === "playing" && (
              <>
                <span className="text-primary-700 mr-1 flex items-center gap-1 text-xs font-semibold">
                  <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                  <span className="hidden sm:inline">Lecture...</span>
                </span>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100"
                  onClick={handlePauseSpeech}
                  type="button"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </button>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-900 hover:bg-rose-100"
                  onClick={handleStopSpeech}
                  type="button"
                >
                  <Square className="h-3 w-3 fill-rose-900" />
                  <span>Stop</span>
                </button>
              </>
            )}
            {audioState === "paused" && (
              <>
                <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-amber-800">
                  <VolumeX className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">En pause</span>
                </span>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                  onClick={handleResumeSpeech}
                  type="button"
                >
                  <Play className="h-3.5 w-3.5 fill-emerald-900" />
                  <span>Reprendre</span>
                </button>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-900 hover:bg-rose-100"
                  onClick={handleStopSpeech}
                  type="button"
                >
                  <Square className="h-3 w-3 fill-rose-900" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>
        </div>

        <FluencyTextDisplay
          content={text.content}
          dyslexicMode={dyslexicMode}
        />
      </div>

      {text.comprehensionQuestions &&
        text.comprehensionQuestions.length > 0 && (
          <div className="bg-paper space-y-3 rounded-xl border border-stone-200 p-5">
            <h3 className="font-fun text-base font-bold text-stone-900">
              Questions de compréhension
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {text.comprehensionQuestions.map((q, idx) => {
                const isRevealed = revealedQuestions.has(idx);
                return (
                  <div
                    className="bg-cream/60 flex flex-col justify-between rounded-lg border border-stone-200 p-3.5"
                    key={idx}
                  >
                    <p className="mb-2.5 text-xs font-semibold text-stone-800 sm:text-sm">
                      {idx + 1}. {q.question}
                    </p>

                    {isRevealed ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900">
                        {q.answer}
                      </div>
                    ) : (
                      <button
                        className="bg-paper cursor-pointer self-start rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100"
                        onClick={() => handleToggleQuestion(idx)}
                        type="button"
                      >
                        Voir la réponse
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
};
