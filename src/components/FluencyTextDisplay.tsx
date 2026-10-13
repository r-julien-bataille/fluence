import { CheckCircle2, Headphones, X, XCircle } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AlignedToken } from "@/lib/alignment";
import { speakFrenchText, syllabifyFrenchWord } from "@/lib/audio/speech";
import { tokenizeFrenchText } from "@/lib/utils";

const WHITESPACE_REGEX = /\s+/u;
const WORD_BOUNDARY_REGEX =
  /^([^a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]*)(.*?)([^a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]*)$/u;
const SENTENCE_END_PUNCTUATION_REGEX = /[.!?]$/u;
const CLAUSE_PAUSE_PUNCTUATION_REGEX = /[,;:]$/u;

const TARGET_CHARS_PER_LINE = 52;
const MAX_CHARS_PER_LINE = 60;
const MIN_WORDS_PER_LINE = 5;
const MAX_WORDS_PER_LINE = 10;
const MAX_ABSORB_CHARS = 68;

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

interface PopoverPosition {
  caretLeft: number;
  left: number;
  placement: "top" | "bottom";
  top: number;
}

const calculatePopoverPosition = (el: HTMLElement): PopoverPosition => {
  const rect = el.getBoundingClientRect();
  const popoverWidth = 320;
  const popoverHeight = 120;
  const margin = 10;

  const wordCenterX = rect.left + rect.width / 2;
  const left = Math.max(
    16,
    Math.min(
      window.innerWidth - popoverWidth - 16,
      wordCenterX - popoverWidth / 2
    )
  );
  const caretLeft = Math.max(
    20,
    Math.min(popoverWidth - 20, wordCenterX - left)
  );

  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const placement: "top" | "bottom" =
    spaceAbove >= popoverHeight + margin || spaceAbove > spaceBelow
      ? "top"
      : "bottom";

  const top =
    placement === "top"
      ? Math.max(12, rect.top - popoverHeight - margin)
      : Math.min(window.innerHeight - popoverHeight - 12, rect.bottom + margin);

  return { caretLeft, left, placement, top };
};

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
  const [activeWordEl, setActiveWordEl] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.innerWidth < 640
  );
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBicolorSyllables(dyslexicMode);
  }, [dyslexicMode]);

  const updatePosition = useCallback(() => {
    if (!activeWordEl) {
      return;
    }
    setPopoverPos(calculatePopoverPosition(activeWordEl));
  }, [activeWordEl]);

  useEffect(() => {
    if (activeWordEl && inspectedWord) {
      updatePosition();
    }
  }, [activeWordEl, inspectedWord, updatePosition]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      updatePosition();
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("scroll", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [updatePosition]);

  // Fermeture de la pop-up au clic en dehors ou avec la touche Échap
  useEffect(() => {
    if (!inspectedWord) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInspectedWord(null);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        popoverRef.current?.contains(target) ||
        target?.closest(".reading-text-flow button")
      ) {
        return;
      }
      setInspectedWord(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [inspectedWord]);

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

  // Découper le texte en lignes logiques d'environ 8 à 10 mots (50-58 caractères)
  // en respectant la ponctuation et le rythme naturel de lecture (protocole ELFE)
  const lines = useMemo<LineChunk[]>(() => {
    const trimmed = content.trim();
    if (!trimmed) {
      return [];
    }

    const rawWords = trimmed.split(WHITESPACE_REGEX);
    const tokenMap = new Map<number, AlignedToken>();

    if (annotatedTokens) {
      for (const t of annotatedTokens) {
        tokenMap.set(t.expectedIndex, t);
      }
    }

    const chunks: LineChunk[] = [];
    let currentWords: LineChunk["words"] = [];
    let currentChars = 0;
    let cumulative = 0;
    let tokenCounter = 0;

    for (const [i, word] of rawWords.entries()) {
      const subTokens = tokenizeFrenchText(word);
      const wordLen = word.length;
      const addedChars = currentWords.length > 0 ? wordLen + 1 : wordLen;
      const remainingWords = rawWords.length - i;

      let shouldBreak = false;

      if (currentWords.length >= MIN_WORDS_PER_LINE) {
        const prevWord = currentWords.at(-1)?.original ?? "";
        const prevEndsWithPeriod =
          SENTENCE_END_PUNCTUATION_REGEX.test(prevWord);
        const prevEndsWithComma = CLAUSE_PAUSE_PUNCTUATION_REGEX.test(prevWord);

        // 1. Fin de phrase avec volume suffisant
        if (prevEndsWithPeriod && currentChars >= 36) {
          shouldBreak = true;
        }
        // 2. Pause de proposition (virgule, etc.) avec volume suffisant
        else if (prevEndsWithComma && currentChars >= 42) {
          shouldBreak = true;
        }
        // 3. Limites de longueur en caractères ou nombre de mots
        else if (
          currentChars + addedChars > MAX_CHARS_PER_LINE ||
          currentWords.length >= MAX_WORDS_PER_LINE
        ) {
          shouldBreak = true;
        }
        // 4. Objectif cible de longueur atteint
        else if (currentChars >= TARGET_CHARS_PER_LINE) {
          shouldBreak = true;
        }
      }

      // Éviter de laisser une ligne finale orpheline (moins de 3 mots) si l'absorption est raisonnable
      if (
        shouldBreak &&
        remainingWords < 3 &&
        currentChars + addedChars <= MAX_ABSORB_CHARS
      ) {
        shouldBreak = false;
      }

      if (shouldBreak && currentWords.length > 0) {
        chunks.push({
          cumulativeCount: cumulative,
          words: currentWords,
        });
        currentWords = [];
        currentChars = 0;
      }

      const wordTokenIndex = tokenCounter;
      const matchedToken = tokenMap.get(wordTokenIndex);
      tokenCounter += subTokens.length;
      cumulative += subTokens.length;

      currentWords.push({
        annotated: matchedToken,
        clean: subTokens.map((st) => st.clean).join(" "),
        original: word,
        tokenIndex: wordTokenIndex,
      });

      currentChars += currentWords.length === 1 ? wordLen : wordLen + 1;
    }

    if (currentWords.length > 0) {
      chunks.push({
        cumulativeCount: cumulative,
        words: currentWords,
      });
    }

    return chunks;
  }, [content, annotatedTokens]);

  const handleWordClick = (
    item: LineChunk["words"][0],
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (event?.currentTarget) {
      setActiveWordEl(event.currentTarget);
      setPopoverPos(calculatePopoverPosition(event.currentTarget));
    }
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

  const renderWord = (item: LineChunk["words"][0], wIdx: number) => {
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
          key={item.tokenIndex ?? wIdx}
          onClick={(e) => handleWordClick(item, e)}
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
        key={item.tokenIndex ?? wIdx}
        onClick={(e) => handleWordClick(item, e)}
        type="button"
      >
        {renderWordContent(item.original, bicolorSyllables)}
      </button>
    );
  };

  return (
    <div
      className={`rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all sm:p-10 ${
        dyslexicMode ? "dys-mode" : ""
      }`}
    >
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
        {lines.map((line, lineIdx) => {
          const secondToLastWord = line.words.at(-2);
          const lastWord = line.words.at(-1);

          return (
            <div
              className="flex items-start justify-between gap-4 rounded-xl border-slate-100/60 border-b px-2 pb-2 transition-colors last:border-b-0 hover:bg-slate-50/50"
              key={lineIdx}
            >
              {/* Ligne de texte avec mots */}
              <div className="reading-text-flow flex flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-2 font-medium text-lg text-slate-800 sm:text-xl lg:text-2xl">
                {line.words.length <= 2 || !secondToLastWord || !lastWord ? (
                  line.words.map((item, wIdx) => renderWord(item, wIdx))
                ) : (
                  <>
                    {line.words
                      .slice(0, -2)
                      .map((item, wIdx) => renderWord(item, wIdx))}
                    <span className="inline-flex items-baseline gap-x-2.5 whitespace-nowrap">
                      {renderWord(secondToLastWord, line.words.length - 2)}
                      {renderWord(lastWord, line.words.length - 1)}
                    </span>
                  </>
                )}
              </div>

              {/* Repère de mots cumulés en marge droite (norme ELFE) */}
              <div className="w-12 shrink-0 select-none pt-1 text-right sm:w-16">
                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-bold font-mono text-slate-500 text-xs sm:text-sm">
                  {line.cumulativeCount}
                </span>
              </div>
            </div>
          );
        })}
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

      {/* Pop-up compacte de correction manuelle du mot sélectionné */}
      {showResults && inspectedWord && (isMobile || popoverPos) && (
        <div
          aria-label={`Correction du mot ${inspectedWord.expectedWord}`}
          className={
            isMobile
              ? "fade-in slide-in-from-bottom-4 fixed inset-x-3 bottom-4 z-50 mx-auto max-w-md animate-in rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md duration-200"
              : "fade-in zoom-in-95 fixed z-50 w-80 animate-in rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md duration-150"
          }
          ref={popoverRef}
          role="dialog"
          style={
            isMobile || !popoverPos
              ? undefined
              : {
                  left: `${popoverPos.left}px`,
                  top: `${popoverPos.top}px`,
                }
          }
        >
          {/* Caret indicateur de ciblage pour écran desktop */}
          {!isMobile && popoverPos && (
            <div
              className={`absolute h-2.5 w-2.5 rotate-45 border-slate-700/80 bg-slate-900/95 ${
                popoverPos.placement === "top"
                  ? "-bottom-1.5 border-r border-b"
                  : "-top-1.5 border-t border-l"
              }`}
              style={{ left: `${popoverPos.caretLeft}px` }}
            />
          )}

          {/* En-tête : mot, statut et bouton fermer */}
          <div className="flex items-center justify-between gap-2 border-slate-800 border-b pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-bold text-sm text-white">
                « {inspectedWord.expectedWord} »
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-semibold text-xs ${
                  inspectedWord.status === "correct"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : inspectedWord.status === "error"
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {inspectedWord.status === "correct"
                  ? "Validé"
                  : inspectedWord.errorType === "omission"
                    ? "Omission"
                    : inspectedWord.errorType === "inversion"
                      ? "Inversion"
                      : "Erreur"}
              </span>
            </div>

            <button
              aria-label="Fermer la pop-up"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              onClick={() => setInspectedWord(null)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Détails IA : transcription ou timing */}
          {(inspectedWord.spokenWord ||
            inspectedWord.timestampMs !== undefined) && (
            <div className="my-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-300 text-xs">
              {inspectedWord.spokenWord && (
                <span>
                  IA a entendu :{" "}
                  <strong className="text-amber-300">
                    « {inspectedWord.spokenWord} »
                  </strong>
                </span>
              )}
              {inspectedWord.timestampMs !== undefined && (
                <span className="font-mono text-slate-400">
                  • {(inspectedWord.timestampMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          )}

          {/* Boutons d'actions rapides (réécouter + corriger) */}
          <div className="mt-2.5 flex items-center gap-2">
            {inspectedWord.timestampMs !== undefined && onSeekAudioMs && (
              <button
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 font-semibold text-indigo-300 text-xs transition-colors hover:bg-slate-700"
                onClick={() => {
                  if (inspectedWord.timestampMs !== undefined) {
                    onSeekAudioMs(inspectedWord.timestampMs);
                  }
                }}
                title="Réécouter ce mot dans l'enregistrement"
                type="button"
              >
                <Headphones className="h-3.5 w-3.5 shrink-0" />
                <span>Réécouter</span>
              </button>
            )}

            {onOverrideWordStatus &&
              (inspectedWord.status === "correct" ? (
                <button
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 font-bold text-white text-xs shadow-sm transition-all hover:bg-rose-500"
                  onClick={() => {
                    onOverrideWordStatus(inspectedWord.expectedIndex, "error");
                    setInspectedWord({
                      ...inspectedWord,
                      errorType: "substitution",
                      status: "error",
                    });
                  }}
                  title="Marquer en erreur (corriger l'IA)"
                  type="button"
                >
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>En erreur</span>
                </button>
              ) : (
                <button
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white text-xs shadow-sm transition-all hover:bg-emerald-500"
                  onClick={() => {
                    onOverrideWordStatus(
                      inspectedWord.expectedIndex,
                      "correct"
                    );
                    setInspectedWord({ ...inspectedWord, status: "correct" });
                  }}
                  title="Valider comme mot lu correctement"
                  type="button"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Valider</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
