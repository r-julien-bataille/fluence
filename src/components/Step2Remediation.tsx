import React, { useState, useEffect } from 'react';
import { ExerciseText, FluencyAttempt } from '@/db/db';
import { Flashcard } from './Flashcard';
import { FluencyTextDisplay } from './FluencyTextDisplay';
import {
  Sparkles,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Volume2,
  Pause,
  Play,
  Square,
  VolumeX,
} from 'lucide-react';
import {
  speakFrenchText,
  pauseFrenchSpeech,
  resumeFrenchSpeech,
  stopFrenchSpeech,
} from '@/lib/audio/speech';

interface Step2RemediationProps {
  text: ExerciseText;
  attempt1: FluencyAttempt;
  onReadyForStep3: () => void;
  dyslexicMode: boolean;
}

type AudioPlayState = 'idle' | 'playing' | 'paused';

export const Step2Remediation: React.FC<Step2RemediationProps> = ({
  text,
  attempt1,
  onReadyForStep3,
  dyslexicMode,
}) => {
  const stumbledWords = attempt1.stumbledWords || [];
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());
  const [revealedQuestions, setRevealedQuestions] = useState<Set<number>>(new Set());
  const [audioState, setAudioState] = useState<AudioPlayState>('idle');

  // Arrêter toute lecture audio quand le composant est démonté
  useEffect(() => {
    return () => {
      stopFrenchSpeech();
    };
  }, []);

  const handleToggleMastered = (word: string) => {
    setMasteredWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const handleToggleQuestion = (index: number) => {
    setRevealedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Lecture complète avec gestion Play / Pause / Reprendre / Arrêter
  const handleStartFullSpeech = async () => {
    setAudioState('playing');
    await speakFrenchText(text.content, {
      rate: 0.82,
      onEnd: () => {
        setAudioState('idle');
      },
      onError: () => {
        setAudioState('idle');
      },
    });
  };

  const handlePauseSpeech = () => {
    pauseFrenchSpeech();
    setAudioState('paused');
  };

  const handleResumeSpeech = () => {
    resumeFrenchSpeech();
    setAudioState('playing');
  };

  const handleStopSpeech = () => {
    stopFrenchSpeech();
    setAudioState('idle');
  };

  const handleProceedToStep3 = () => {
    stopFrenchSpeech();
    onReadyForStep3();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* En-tête de l'étape 2 */}
      <div className="bg-amber-500/10 border border-amber-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
              Étape 2 sur 3
            </span>
            <span className="text-xs text-amber-900 font-semibold">
              Sans chronomètre · À ton rythme
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-fun">
            Remédiation & Consolidation
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
            Entraîne-toi sur les mots qui t'ont posé difficulté lors de la première lecture, puis relis le texte tranquillement pour préparer ton Défi Record !
          </p>
        </div>

        <button
          onClick={handleProceedToStep3}
          className="shrink-0 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>Prêt pour le Défi Record (60s) !</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cartes interactives des mots butés */}
      {stumbledWords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 font-fun flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Mots à consolider ({masteredWords.size} / {stumbledWords.length} maîtrisés)</span>
            </h3>
            <span className="text-xs text-slate-400">
              Écoute la prononciation en français et repère les syllabes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stumbledWords.map((word, idx) => (
              <Flashcard
                key={idx}
                word={word}
                isMastered={masteredWords.has(word)}
                onMastered={handleToggleMastered}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lecture fluide du texte complet sans chrono avec contrôles audio (Play/Pause/Stop) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 font-fun flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Relis le texte entier à voix haute</span>
          </h3>

          {/* Barre de contrôles de lecture audio */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            {audioState === 'idle' ? (
              <button
                onClick={handleStartFullSpeech}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                title="Écouter la lecture complète du texte par le modèle français"
              >
                <Volume2 className="w-4 h-4" />
                <span>Écouter le modèle complet</span>
              </button>
            ) : audioState === 'playing' ? (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 mr-1 animate-pulse">
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Lecture en cours...</span>
                </span>
                <button
                  onClick={handlePauseSpeech}
                  className="p-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Mettre en pause"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Pause</span>
                </button>
                <button
                  onClick={handleStopSpeech}
                  className="p-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Arrêter la lecture"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-900" />
                  <span className="text-[11px]">Arrêter</span>
                </button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mr-1">
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden sm:inline">En pause</span>
                </span>
                <button
                  onClick={handleResumeSpeech}
                  className="p-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reprendre la lecture"
                >
                  <Play className="w-3.5 h-3.5 fill-emerald-900" />
                  <span className="text-[11px]">Reprendre</span>
                </button>
                <button
                  onClick={handleStopSpeech}
                  className="p-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Arrêter la lecture"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-900" />
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
      {text.comprehensionQuestions && text.comprehensionQuestions.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base font-fun">
                Compréhension de l'histoire
              </h4>
              <p className="text-xs text-slate-500">
                Vérifie que tu as bien compris le sens du texte
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {text.comprehensionQuestions.map((q, idx) => {
              const isRevealed = revealedQuestions.has(idx);
              return (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div className="text-sm font-semibold text-slate-800 mb-3">
                    Question {idx + 1} : {q.question}
                  </div>

                  <div>
                    {isRevealed ? (
                      <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-medium border border-emerald-200 animate-in fade-in">
                        <span className="font-bold">Réponse :</span> {q.answer}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleQuestion(idx)}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
          onClick={handleProceedToStep3}
          className="py-4 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-extrabold text-base shadow-xl shadow-indigo-200 flex items-center gap-3 transition-all hover:scale-105 cursor-pointer"
        >
          <Sparkles className="w-6 h-6 text-amber-300" />
          <span>Lancer le Défi Record (Chrono 60s)</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
