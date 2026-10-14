import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  Pause,
  Play,
  Sparkles,
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

  // Arrêter toute lecture audio quand le composant est démonté
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

  // Lecture complète avec gestion Play / Pause / Reprendre / Arrêter
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
    <div className="fade-in animate-in space-y-8 duration-300">
      {/* En-tête de l'étape 2 */}
      <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-amber-200/80 bg-amber-500/10 p-6 sm:p-8 md:flex-row">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800 text-xs">
              Étape 2 sur 3
            </span>
            <span className="font-semibold text-amber-900 text-xs">
              Sans chronomètre · À ton rythme
            </span>
          </div>
          <h2 className="font-extrabold font-fun text-2xl text-stone-900 sm:text-3xl">
            Remédiation & Consolidation
          </h2>
          <p className="mt-1 max-w-xl text-stone-600 text-xs sm:text-sm">
            Entraîne-toi sur les mots qui t’ont posé difficulté lors de la
            première lecture, puis relis le texte tranquillement pour préparer
            ton Défi Record !
          </p>
        </div>

        <button
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-primary-600 px-6 py-3.5 font-bold text-sm text-white shadow-lg shadow-primary-200 transition-all hover:scale-105 hover:bg-primary-700"
          onClick={handleProceedToStep3}
          type="button"
        >
          <Sparkles className="h-5 w-5 text-amber-300" />
          <span>Prêt pour le Défi Record (60s) !</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Cartes interactives des mots butés */}
      {stumbledWords.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold font-fun text-lg text-stone-900">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>
                Mots à consolider ({masteredWords.size} / {stumbledWords.length}{" "}
                maîtrisés)
              </span>
            </h3>
            <span className="text-stone-500 text-xs">
              Écoute la prononciation en français et repère les syllabes
            </span>
          </div>

          <div
            className={`grid gap-5 ${
              stumbledWords.length === 1
                ? "mx-auto max-w-sm grid-cols-1"
                : stumbledWords.length === 2
                  ? "mx-auto max-w-2xl grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {stumbledWords.map((word) => (
              <Flashcard
                isMastered={masteredWords.has(word)}
                key={word}
                onMastered={handleToggleMastered}
                word={word}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900">
          <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="font-medium text-xs sm:text-sm">
            <strong>Félicitations !</strong> Aucun mot difficile détecté lors de
            la première lecture. Relis le texte ci-dessous pour perfectionner
            ton intonation avant le Défi Record.
          </p>
        </div>
      )}

      {/* Lecture fluide du texte complet sans chrono avec contrôles audio (Play/Pause/Stop) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-bold font-fun text-lg text-stone-900">
            <BookOpen className="h-5 w-5 text-primary-600" />
            <span>Relis le texte entier à voix haute</span>
          </h3>

          {/* Barre de contrôles de lecture audio */}
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-paper px-3 py-1.5 shadow-2xs">
            {audioState === "idle" && (
              <button
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-1 font-semibold text-primary-600 text-xs transition-colors hover:bg-primary-100 hover:text-primary-800"
                onClick={handleStartFullSpeech}
                title="Écouter la lecture complète du texte par le modèle français"
                type="button"
              >
                <Volume2 className="h-4 w-4" />
                <span>Écouter le modèle complet</span>
              </button>
            )}
            {audioState === "playing" && (
              <>
                <span className="mr-1 flex animate-pulse items-center gap-1.5 font-bold text-primary-700 text-xs">
                  <Volume2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Lecture en cours...</span>
                </span>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-xl bg-amber-100 p-1.5 font-bold text-amber-900 text-xs transition-colors hover:bg-amber-200"
                  onClick={handlePauseSpeech}
                  title="Mettre en pause"
                  type="button"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Pause</span>
                </button>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-xl bg-rose-100 p-1.5 font-bold text-rose-900 text-xs transition-colors hover:bg-rose-200"
                  onClick={handleStopSpeech}
                  title="Arrêter la lecture"
                  type="button"
                >
                  <Square className="h-3.5 w-3.5 fill-rose-900" />
                  <span className="text-[11px]">Arrêter</span>
                </button>
              </>
            )}
            {audioState === "paused" && (
              <>
                <span className="mr-1 flex items-center gap-1.5 font-bold text-amber-700 text-xs">
                  <VolumeX className="h-4 w-4" />
                  <span className="hidden sm:inline">En pause</span>
                </span>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-xl bg-emerald-100 p-1.5 font-bold text-emerald-900 text-xs transition-colors hover:bg-emerald-200"
                  onClick={handleResumeSpeech}
                  title="Reprendre la lecture"
                  type="button"
                >
                  <Play className="h-3.5 w-3.5 fill-emerald-900" />
                  <span className="text-[11px]">Reprendre</span>
                </button>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-xl bg-rose-100 p-1.5 font-bold text-rose-900 text-xs transition-colors hover:bg-rose-200"
                  onClick={handleStopSpeech}
                  title="Arrêter la lecture"
                  type="button"
                >
                  <Square className="h-3.5 w-3.5 fill-rose-900" />
                  <span className="text-[11px]">Arrêter</span>
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

      {/* Questions de compréhension */}
      {text.comprehensionQuestions &&
        text.comprehensionQuestions.length > 0 && (
          <div className="space-y-4 rounded-3xl border border-stone-200/90 bg-paper p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold font-fun text-base text-stone-900">
                  Compréhension de l’histoire
                </h4>
                <p className="text-stone-500 text-xs">
                  Vérifie que tu as bien compris le sens du texte
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              {text.comprehensionQuestions.map((q, idx) => {
                const isRevealed = revealedQuestions.has(idx);
                return (
                  <div
                    className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-cream p-4"
                    key={idx}
                  >
                    <div className="mb-3 font-semibold text-sm text-stone-800">
                      Question {idx + 1} : {q.question}
                    </div>

                    <div>
                      {isRevealed ? (
                        <div className="fade-in animate-in rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-medium text-emerald-900 text-xs">
                          <span className="font-bold">Réponse :</span>{" "}
                          {q.answer}
                        </div>
                      ) : (
                        <button
                          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-paper px-3 py-2 font-semibold text-stone-700 text-xs transition-colors hover:bg-stone-100"
                          onClick={() => handleToggleQuestion(idx)}
                          type="button"
                        >
                          <span>Afficher la réponse</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Bouton pour lancer l'étape 3 */}
      <div className="flex justify-center pt-4">
        <button
          className="flex cursor-pointer items-center gap-3 rounded-3xl bg-primary-600 px-8 py-4 font-extrabold text-base text-white shadow-primary-200 shadow-xl transition-all hover:scale-105 hover:bg-primary-700"
          onClick={handleProceedToStep3}
          type="button"
        >
          <Sparkles className="h-6 w-6 text-amber-300" />
          <span>Lancer le Défi Record (Chrono 60s)</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
