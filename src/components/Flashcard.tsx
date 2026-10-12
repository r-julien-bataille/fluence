import React, { useState } from 'react';
import { Volume2, Check, Sparkles, VolumeX } from 'lucide-react';
import { syllabifyFrenchWord, speakFrenchText } from '@/lib/audio/speech';

interface FlashcardProps {
  word: string;
  onMastered?: (word: string) => void;
  isMastered?: boolean;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  word,
  onMastered,
  isMastered = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSyllables, setShowSyllables] = useState(true);

  const syllables = syllabifyFrenchWord(word);

  const handleSpeak = async (slow: boolean = false) => {
    setIsPlaying(true);
    await speakFrenchText(word, slow ? 0.65 : 0.85);
    setIsPlaying(false);
  };

  return (
    <div
      className={`relative bg-white rounded-3xl p-6 shadow-sm border-2 transition-all duration-300 ${
        isMastered
          ? 'border-emerald-300 bg-emerald-50/20'
          : 'border-indigo-100 hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
          Mot à consolider
        </span>
        {isMastered && (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Revalidé
          </span>
        )}
      </div>

      <div className="text-center py-4">
        {/* Mot complet */}
        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-wide mb-3 font-fun">
          {word}
        </div>

        {/* Décomposition syllabique */}
        {showSyllables && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/70 text-indigo-900 rounded-2xl text-base font-semibold border border-indigo-100">
            {syllables.map((s, idx) => (
              <React.Fragment key={idx}>
                <span className="hover:text-indigo-600 transition-colors">{s}</span>
                {idx < syllables.length - 1 && <span className="text-indigo-300">·</span>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Boutons d'interaction */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 mt-2">
        <button
          onClick={() => handleSpeak(false)}
          disabled={isPlaying}
          className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          title="Écouter la prononciation modèle"
        >
          {isPlaying ? <VolumeX className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
          <span>Écouter</span>
        </button>

        <button
          onClick={() => handleSpeak(true)}
          disabled={isPlaying}
          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          title="Écouter au ralenti pour bien décomposer les sons"
        >
          Ralenti
        </button>

        <button
          onClick={() => setShowSyllables(!showSyllables)}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
            showSyllables
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'
          }`}
          title="Afficher ou masquer les syllabes"
        >
          Syllabes
        </button>

        {onMastered && (
          <button
            onClick={() => onMastered(word)}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              isMastered
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-transparent hover:border-emerald-200'
            }`}
            title="Marquer comme revalidé"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isMastered ? 'Validé' : 'Je sais le lire !'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
