import { CheckCircle2, Headphones, XCircle } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import type { AlignedToken } from "@/lib/alignment";
import { speakFrenchText, syllabifyFrenchWord } from "@/lib/audio/speech";
import { tokenizeFrenchText } from "@/lib/utils";

const WHITESPACE_REGEX = /\s+/u;
const WORD_BOUNDARY_REGEX =
  /^([^a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]*)(.*?)([^a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]*)$/u;

interface FluencyTextDisplayProps {
  activeWordIndex?: number;
  annotatedTokens?: AlignedToken[];
  content: string;
  dyslexicMode?: boolean;
  onOverrideWordStatus?: (
    expectedIndex: number,
    newStatus: "correct" | "error"
  ) => void;
  onSeekAudioMs?: (timestampMs: number) => void;
  onWordClick?: (token: AlignedToken | { word: string; index: number }) => void;
  // Nouvelles fonctionnalités de synchronisation audio
  playbackTimeMs?: number;
  showResults?: boolean;
}

interface LineChunk {
  cumulativeCount: number;
  words: {
    original: string;
    clean: string;
    tokenIndex: number;
    annotated?: AlignedToken;
  }[];
}

export const FluencyTextDisplay: React.FC<FluencyTextDisplayProps> = ({
  content,
  annotatedTokens,
  showResults = false,
  activeWordIndex,
  onWordClick,
  dyslexicMode = false,
  playbackTimeMs,
  onSeekAudioMs,
  onOverrideWordStatus,
}) => {
  const [inspectedWord, setInspectedWord] = useState<AlignedToken | null>(null);
  const [bicolorSyllables, setBicolorSyllables] = useState(dyslexicMode);

  useEffect(() => {
    setBicolorSyllables(dyslexicMode);
  }, [dyslexicMode]);

  const renderWordContent = (
    word: string,
    isBicolor: boolean
  ): React.ReactNode => {
    if (!isBicolor) {
      return word;
    }
    const match = word.match(WORD_BOUNDARY_REGEX);
    if (!match) {
      return word;
    }
    const [, prefix = "", core = "", suffix = ""] = match;
    if (core.length <= 3) {
      return word;
    }
    const syllables = syllabifyFrenchWord(core);
    if (syllables.length <= 1) {
      return word;
    }
    return (
      <span className="inline-flex items-baseline">
        {prefix}
        {syllables.map((s, idx) => (
          <span
            className={
              idx % 2 === 0
                ? "font-semibold text-indigo-900"
                : "font-bold text-rose-600"
            }
            key={idx}
          >
            {s}
          </span>
        ))}
        {suffix}
      </span>
    );
  };

  // Découper le texte en lignes logiques d'environ 10 à 12 mots pour simuler la feuille de fluence officielle
  const lines = useMemo<LineChunk[]>(() => {
    const rawWords = content.trim().split(WHITESPACE_REGEX);
    const tokenMap = new Map<number, AlignedToken>();

    if (annotatedTokens) {
      for (const t of annotatedTokens) {
        tokenMap.set(t.expectedIndex, t);
      }
    }

    const chunks: LineChunk[] = [];
    const WORDS_PER_LINE = 10;
    let currentWords: LineChunk["words"] = [];
    let cumulative = 0;
    let tokenCounter = 0;

    for (const [i, word] of rawWords.entries()) {
      const subTokens = tokenizeFrenchText(word);
      tokenCounter += subTokens.length;
      cumulative += subTokens.length;

      const matchedToken = tokenMap.get(tokenCounter - subTokens.length);

      currentWords.push({
        annotated: matchedToken,
        clean: subTokens.map((st) => st.clean).join(" "),
        original: word,
        tokenIndex: tokenCounter - subTokens.length,
      });

      if (currentWords.length >= WORDS_PER_LINE || i === rawWords.length - 1) {
        chunks.push({
          cumulativeCount: cumulative,
          words: currentWords,
        });
        currentWords = [];
      }
    }

    return chunks;
  }, [content, annotatedTokens]);

  const handleWordClick = (item: LineChunk["words"][0]) => {
    const ann = item.annotated;
    if (showResults && ann) {
      setInspectedWord(ann);
      if (onSeekAudioMs && ann.timestampMs !== undefined) {
        onSeekAudioMs(ann.timestampMs);
      }
      if (onWordClick) {
        onWordClick(ann);
      }
    } else {
      speakFrenchText(item.original);
    }
  };

  return (
    <div
      className={`rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all sm:p-10 ${
        dyslexicMode ? "dys-mode" : ""
      }`}
    >
      {/* Panneau d'inspection détaillée du mot sélectionné */}
      {showResults && inspectedWord && (
        <div className="fade-in mb-6 flex animate-in flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-md duration-200 sm:p-5 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-lg ${
                inspectedWord.status === "correct"
                  ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                  : inspectedWord.status === "error"
                    ? "border border-rose-500/40 bg-rose-500/20 text-rose-400"
                    : "border border-amber-500/40 bg-amber-500/20 text-amber-400"
              }`}
            >
              {inspectedWord.status === "correct"
                ? "✓"
                : inspectedWord.status === "error"
                  ? "✕"
                  : "⋯"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">
                  Mot : « {inspectedWord.expectedWord} »
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold text-xs ${
                    inspectedWord.status === "correct"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : inspectedWord.status === "error"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {inspectedWord.status === "correct"
                    ? "Validé (positif)"
                    : inspectedWord.errorType === "omission"
                      ? "Omission (mot sauté)"
                      : inspectedWord.errorType === "inversion"
                        ? "Inversion"
                        : "Erreur / substitution"}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300 text-xs">
                {inspectedWord.spokenWord && (
                  <span>
                    Transcription IA :{" "}
                    <strong className="text-amber-300">
                      « {inspectedWord.spokenWord} »
                    </strong>
                  </span>
                )}
                {inspectedWord.timestampMs !== undefined && (
                  <span className="font-mono text-slate-400">
                    Position audio :{" "}
                    {(inspectedWord.timestampMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions enseignant / vérification */}
          <div className="flex w-full items-center justify-end gap-2 md:w-auto">
            {inspectedWord.timestampMs !== undefined && onSeekAudioMs && (
              <button
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 font-semibold text-indigo-300 text-xs transition-colors hover:bg-slate-700"
                onClick={() => {
                  if (inspectedWord.timestampMs !== undefined) {
                    onSeekAudioMs(inspectedWord.timestampMs);
                  }
                }}
                title="Écouter le mot dans l'enregistrement de l'enfant"
                type="button"
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>Réécouter</span>
              </button>
            )}

            {onOverrideWordStatus &&
              (inspectedWord.status === "correct" ? (
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white text-xs shadow-sm transition-all hover:bg-rose-500"
                  onClick={() => {
                    onOverrideWordStatus(inspectedWord.expectedIndex, "error");
                    setInspectedWord({
                      ...inspectedWord,
                      errorType: "substitution",
                      status: "error",
                    });
                  }}
                  title="L'enfant a fait une erreur non détectée : corriger l'IA"
                  type="button"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Compter en erreur</span>
                </button>
              ) : (
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white text-xs shadow-sm transition-all hover:bg-emerald-500"
                  onClick={() => {
                    onOverrideWordStatus(
                      inspectedWord.expectedIndex,
                      "correct"
                    );
                    setInspectedWord({ ...inspectedWord, status: "correct" });
                  }}
                  title="L'enfant a bien lu ce mot : corriger l'IA"
                  type="button"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Valider comme juste</span>
                </button>
              ))}

            <button
              className="px-2 py-1 text-slate-400 text-xs hover:text-white"
              onClick={() => setInspectedWord(null)}
              type="button"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Barre d'outils d'accessibilité de lecture */}
      {!showResults && (
        <div className="mb-4 flex items-center justify-between border-slate-100 border-b pb-3 text-xs">
          <span className="hidden font-medium text-slate-400 sm:inline">
            Repères de mots cumulés en marge droite (protocole ELFE)
          </span>
          <button
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 font-bold transition-all ${
              bicolorSyllables
                ? "border border-indigo-200 bg-indigo-100 text-indigo-900 shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            onClick={() => setBicolorSyllables(!bicolorSyllables)}
            title="Affiche les syllabes en couleurs alternées pour faciliter le décodage dyslexique"
            type="button"
          >
            <span>🎨 Syllabes bicolores (Dys)</span>
            <span
              className={`h-2 w-2 rounded-full transition-colors ${
                bicolorSyllables
                  ? "bg-indigo-600 ring-2 ring-indigo-300"
                  : "bg-slate-300"
              }`}
            />
          </button>
        </div>
      )}

      {/* Rendu du texte avec indicateur de lecture audio synchronisée */}
      <div className="space-y-4">
        {lines.map((line, lineIdx) => (
          <div
            className="flex items-start justify-between gap-4 rounded-xl border-slate-100/60 border-b px-2 pb-2 transition-colors last:border-b-0 hover:bg-slate-50/50"
            key={lineIdx}
          >
            {/* Ligne de texte avec mots */}
            <div className="reading-text-flow flex flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-2 font-medium text-lg text-slate-800 sm:text-2xl">
              {line.words.map((item, wIdx) => {
                const ann = item.annotated;

                // Vérifier si le mot correspond au moment actuel de la lecture audio
                const isCurrentlyPlayingAudio =
                  showResults &&
                  ann &&
                  ann.timestampMs !== undefined &&
                  playbackTimeMs !== undefined &&
                  playbackTimeMs >= ann.timestampMs &&
                  playbackTimeMs < ann.timestampMs + 650;

                const isInspected =
                  showResults &&
                  inspectedWord &&
                  inspectedWord.expectedIndex === ann?.expectedIndex;

                if (showResults && ann) {
                  let styleClass = "";
                  let tooltip = "";

                  if (ann.status === "correct") {
                    styleClass =
                      "bg-emerald-100/90 text-emerald-950 border-b-2 border-emerald-500 px-1.5 py-0.5 rounded-lg";
                    tooltip = `Correctement lu (${ann.timestampMs ? `${(ann.timestampMs / 1000).toFixed(1)}s` : ""}) - Cliquer pour écouter`;
                  } else if (ann.status === "hesitation") {
                    styleClass =
                      "bg-amber-100 text-amber-950 border-b-2 border-amber-500 px-1.5 py-0.5 rounded-lg";
                    tooltip = `Hésitation > 3s ${ann.spokenWord ? `(dit: "${ann.spokenWord}")` : ""} - Cliquer pour écouter`;
                  } else if (ann.status === "error") {
                    styleClass =
                      "bg-rose-100 text-rose-950 border-b-2 border-rose-500 px-1.5 py-0.5 rounded-lg";
                    tooltip =
                      ann.errorType === "omission"
                        ? "Omission (mot sauté) - Cliquer pour écouter"
                        : ann.errorType === "inversion"
                          ? "Inversion de mots - Cliquer pour écouter"
                          : `Substitution ${ann.spokenWord ? `(lu: "${ann.spokenWord}")` : ""} - Cliquer pour écouter`;
                  } else if (ann.status === "unreached") {
                    styleClass = "text-slate-400 opacity-50";
                    tooltip = "Non atteint dans les 60s";
                  }

                  return (
                    <button
                      className={`relative inline-block cursor-pointer border-none bg-transparent p-0 font-inherit text-inherit transition-all duration-150 ${styleClass} ${
                        isCurrentlyPlayingAudio
                          ? "z-10 scale-110 font-black shadow-md ring-4 ring-indigo-500 ring-offset-2"
                          : isInspected
                            ? "ring-2 ring-slate-900 ring-offset-1"
                            : "hover:scale-105"
                      }`}
                      key={wIdx}
                      onClick={() => handleWordClick(item)}
                      title={tooltip}
                      type="button"
                    >
                      {item.original}
                    </button>
                  );
                }

                // Mode lecture simple
                const isCurrent = activeWordIndex === item.tokenIndex;

                return (
                  <button
                    className={`inline-block cursor-pointer border-none bg-transparent p-0 font-inherit text-inherit transition-colors hover:text-indigo-600 ${
                      isCurrent
                        ? "rounded-sm bg-amber-200 px-1 text-amber-950 shadow-xs"
                        : ""
                    }`}
                    key={wIdx}
                    onClick={() => handleWordClick(item)}
                    type="button"
                  >
                    {renderWordContent(item.original, bicolorSyllables)}
                  </button>
                );
              })}
            </div>

            {/* Repère de mots cumulés en marge droite (norme ELFE) */}
            <div className="w-12 shrink-0 select-none pt-1 text-right sm:w-16">
              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-bold font-mono text-slate-500 text-xs sm:text-sm">
                {line.cumulativeCount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showResults && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-slate-100 border-t pt-6 text-slate-600 text-xs sm:flex-row sm:items-center sm:text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">Légende :</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded border border-emerald-500 bg-emerald-200" />
              <span>Vert : Mot bien lu (vrai positif)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded border border-rose-500 bg-rose-200" />
              <span>Rouge : Erreur / Omission (négatif)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded border border-amber-500 bg-amber-200" />
              <span>Orange : Hésitation &gt; 3s</span>
            </span>
          </div>

          <div className="flex items-center gap-1 font-medium text-indigo-600 text-xs">
            <Headphones className="h-4 w-4" />
            <span>
              Clique sur n'importe quel mot pour réécouter et vérifier la
              décision de l'IA
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
