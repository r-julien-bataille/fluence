import { Check, Volume2, VolumeX } from "lucide-react";
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

  const syllables = syllabifyFrenchWord(word);

  const handleSpeak = async (slow = false) => {
    setIsPlaying(true);
    await speakFrenchText(word, slow ? 0.65 : 0.85);
    setIsPlaying(false);
  };

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border bg-paper p-4 transition-colors ${
        isMastered
          ? "border-emerald-300 bg-emerald-50/40"
          : "border-stone-200 hover:border-primary-300"
      }`}
    >
      <div className="py-3 text-center">
        <div className="mb-2 font-bold font-fun text-2xl text-stone-900 sm:text-3xl">
          {word}
        </div>

        {syllables.length > 1 && (
          <div className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-cream px-2.5 py-1 font-semibold text-stone-800 text-xs">
            {syllables.map((s, idx) => (
              <Fragment key={idx}>
                <span
                  className={
                    idx % 2 === 0 ? "text-primary-800" : "text-rose-700"
                  }
                >
                  {s}
                </span>
                {idx < syllables.length - 1 && (
                  <span className="text-stone-400">·</span>
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-stone-100 border-t pt-3">
        <button
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-2.5 py-1.5 font-bold text-white text-xs transition-colors hover:bg-primary-700 disabled:opacity-50"
          disabled={isPlaying}
          onClick={() => handleSpeak(false)}
          title="Écouter la prononciation"
          type="button"
        >
          {isPlaying ? (
            <VolumeX className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
          <span>Écouter</span>
        </button>

        <button
          className="cursor-pointer rounded-lg border border-stone-200 bg-cream/60 px-2.5 py-1.5 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream disabled:opacity-50"
          disabled={isPlaying}
          onClick={() => handleSpeak(true)}
          title="Écouter au ralenti"
          type="button"
        >
          Lent
        </button>

        {onMastered && (
          <button
            aria-label={
              isMastered ? "Marqué comme lu" : "Marquer ce mot comme maîtrisé"
            }
            aria-pressed={isMastered}
            className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 font-bold text-xs transition-colors ${
              isMastered
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-stone-200 bg-paper text-stone-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900"
            }`}
            onClick={() => onMastered(word)}
            title="Marquer comme maîtrisé"
            type="button"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{isMastered ? "Su" : "Ok"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
