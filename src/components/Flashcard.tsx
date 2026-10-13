import { Check, Sparkles, Volume2, VolumeX } from "lucide-react";
import React, { useState } from "react";

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
      className={`relative rounded-3xl border-2 bg-white p-6 shadow-sm transition-all duration-300 ${
        isMastered
          ? "border-emerald-300 bg-emerald-50/20"
          : "border-indigo-100 hover:border-indigo-300 hover:shadow-md"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="font-bold text-indigo-400 text-xs uppercase tracking-wider">
          Mot à consolider
        </span>
        {isMastered && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700 text-xs">
            <Check className="h-3.5 w-3.5" /> Revalidé
          </span>
        )}
      </div>

      <div className="py-4 text-center">
        {/* Mot complet */}
        <div className="mb-3 font-extrabold font-fun text-3xl text-slate-900 tracking-wide sm:text-4xl">
          {word}
        </div>

        {/* Décomposition syllabique */}
        {showSyllables && (
          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 font-semibold text-base text-indigo-900">
            {syllables.map((s, idx) => (
              <React.Fragment key={idx}>
                <span className="transition-colors hover:text-indigo-600">
                  {s}
                </span>
                {idx < syllables.length - 1 && (
                  <span className="text-indigo-300">·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Boutons d'interaction */}
      <div className="mt-2 flex items-center justify-center gap-2 border-slate-100 border-t pt-2">
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 font-semibold text-white text-xs shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50 sm:text-sm"
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
          className="rounded-xl bg-slate-100 px-3 py-2.5 font-semibold text-slate-700 text-xs transition-all hover:bg-slate-200 disabled:opacity-50"
          disabled={isPlaying}
          onClick={() => handleSpeak(true)}
          title="Écouter au ralenti pour bien décomposer les sons"
          type="button"
        >
          Ralenti
        </button>

        <button
          className={`rounded-xl border px-3 py-2.5 font-semibold text-xs transition-all ${
            showSyllables
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
          onClick={() => setShowSyllables(!showSyllables)}
          title="Afficher ou masquer les syllabes"
          type="button"
        >
          Syllabes
        </button>

        {onMastered && (
          <button
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 font-semibold text-xs transition-all ${
              isMastered
                ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                : "border-transparent bg-slate-100 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
            onClick={() => onMastered(word)}
            title="Marquer comme revalidé"
            type="button"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{isMastered ? "Validé" : "Je sais le lire !"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
