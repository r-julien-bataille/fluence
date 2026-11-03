import { Check, Volume2, VolumeX } from "lucide-react";
import type React from "react";
import { Fragment, useState } from "react";

import { getWordSyllableTokens, speakFrenchText } from "@/lib/audio/speech";

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

  const tokens = getWordSyllableTokens(word);
  const syllableCount = tokens.filter((t) => !t.isHyphen).length;

  const handleSpeak = async (slow = false) => {
    setIsPlaying(true);
    await speakFrenchText(word, slow ? 0.65 : 0.85);
    setIsPlaying(false);
  };

  return (
    <div
      className={`bg-paper flex flex-col justify-between rounded-xl border p-4 transition-colors ${
        isMastered
          ? "border-emerald-300 bg-emerald-50/40"
          : "hover:border-primary-300 border-stone-200"
      }`}
    >
      <div className="py-3 text-center">
        <div className="font-fun mb-2 text-2xl font-bold text-stone-900 sm:text-3xl">
          {word}
        </div>

        {syllableCount > 1 && (
          <div className="bg-cream inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-800">
            {(() => {
              let syllableIdx = 0;
              return tokens.map((token, idx) => {
                if (token.isHyphen) {
                  return (
                    <span className="font-bold text-stone-600" key={idx}>
                      {token.text}
                    </span>
                  );
                }
                const isEven = syllableIdx % 2 === 0;
                syllableIdx += 1;
                const nextToken = tokens[idx + 1];
                const showDot =
                  idx < tokens.length - 1 && nextToken && !nextToken.isHyphen;
                return (
                  <Fragment key={idx}>
                    <span
                      className={isEven ? "text-primary-800" : "text-rose-700"}
                    >
                      {token.text}
                    </span>
                    {showDot && <span className="text-stone-400">·</span>}
                  </Fragment>
                );
              });
            })()}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-stone-100 pt-3">
        <button
          className="bg-primary-600 hover:bg-primary-700 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
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
          className="bg-cream/60 hover:bg-cream cursor-pointer rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors disabled:opacity-50"
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
            className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
              isMastered
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "bg-paper border-stone-200 text-stone-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900"
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
