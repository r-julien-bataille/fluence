import { Check, Sparkles, Volume2, VolumeX } from "lucide-react";
import type React from "react";
import { Fragment, useState } from "react";

import { speakFrenchText, syllabifyFrenchWord } from "@/lib/audio/speech";

interface FlashcardProps {
  isMastered?: boolean;
  onMastered?: (word: string) => void;
  word: string;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  word,
  onMastered,
  isMastered = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSyllables, setShowSyllables] = useState(true);

  const syllables = syllabifyFrenchWord(word);

  const handleSpeak = async (slow = false) => {
    setIsPlaying(true);
    await speakFrenchText(word, slow ? 0.65 : 0.85);
    setIsPlaying(false);
  };

  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl border-2 bg-white p-6 shadow-sm transition-all duration-300 ${
        isMastered
          ? "border-emerald-300 bg-emerald-50/25 shadow-emerald-50"
          : "border-indigo-100 hover:border-indigo-300 hover:shadow-md"
      }`}
    >
      {/* En-tête de la carte */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-bold text-indigo-500 text-xs uppercase tracking-wider">
          Mot à consolider
        </span>
        {isMastered ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 text-xs">
            <Check className="h-3.5 w-3.5" /> Revalidé
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600 text-xs">
            À travailler
          </span>
        )}
      </div>

      {/* Zone centrale du mot et des syllabes */}
      <div className="my-auto py-5 text-center">
        <div className="mb-3 font-extrabold font-fun text-3xl text-slate-900 tracking-wide sm:text-4xl">
          {word}
        </div>

        {showSyllables && (
          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-1.5 font-semibold text-base text-indigo-900">
            {syllables.map((s, idx) => (
              <Fragment key={idx}>
                <span className="transition-colors hover:text-indigo-600">
                  {s}
                </span>
                {idx < syllables.length - 1 && (
                  <span className="text-indigo-300">·</span>
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Zone d'actions organisée en 2 rangées nettes */}
      <div className="mt-4 space-y-2.5 border-slate-100 border-t pt-4">
        {/* Ligne 1 : Contrôles audio & affichage syllabes */}
        <div className="flex items-center gap-2">
          <button
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 font-bold text-white text-xs shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-50"
            disabled={isPlaying}
            onClick={() => handleSpeak(false)}
            title="Écouter la prononciation modèle"
            type="button"
          >
            {isPlaying ? (
              <VolumeX className="h-4 w-4 animate-pulse" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            <span>Écouter</span>
          </button>

          <button
            className="flex cursor-pointer items-center justify-center rounded-xl bg-slate-100 px-3 py-2 font-semibold text-slate-700 text-xs transition-all hover:bg-slate-200 disabled:opacity-50"
            disabled={isPlaying}
            onClick={() => handleSpeak(true)}
            title="Écouter au ralenti pour bien décomposer les sons"
            type="button"
          >
            Ralenti
          </button>

          <button
            className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2 font-semibold text-xs transition-all ${
              showSyllables
                ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => setShowSyllables(!showSyllables)}
            title="Afficher ou masquer les syllabes"
            type="button"
          >
            Syllabes
          </button>
        </div>

        {/* Ligne 2 : Bouton de validation d'apprentissage en pleine largeur */}
        {onMastered && (
          <button
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-xs transition-all ${
              isMastered
                ? "border border-emerald-300 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
            onClick={() => onMastered(word)}
            title={
              isMastered
                ? "Mot validé ! Cliquer pour annuler"
                : "Cliquer pour marquer ce mot comme maîtrisé"
            }
            type="button"
          >
            {isMastered ? (
              <>
                <Check className="h-4 w-4 text-white" />
                <span>Mot maîtrisé !</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Je sais le lire !</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
