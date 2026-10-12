import React, { useMemo, useState, useEffect } from 'react';
import { AlignedToken } from '@/lib/alignment';
import { tokenizeFrenchText } from '@/lib/utils';
import { speakFrenchText, syllabifyFrenchWord } from '@/lib/audio/speech';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Headphones,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface FluencyTextDisplayProps {
  content: string;
  annotatedTokens?: AlignedToken[];
  showResults?: boolean;
  activeWordIndex?: number;
  onWordClick?: (token: AlignedToken | { word: string; index: number }) => void;
  dyslexicMode?: boolean;
  // Nouvelles fonctionnalités de synchronisation audio
  playbackTimeMs?: number;
  onSeekAudioMs?: (timestampMs: number) => void;
  onOverrideWordStatus?: (expectedIndex: number, newStatus: 'correct' | 'error') => void;
}

interface LineChunk {
  words: {
    original: string;
    clean: string;
    tokenIndex: number;
    annotated?: AlignedToken;
  }[];
  cumulativeCount: number;
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

  const renderWordContent = (word: string, isBicolor: boolean): React.ReactNode => {
    if (!isBicolor) return word;
    const match = word.match(/^([^a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]*)(.*?)([^a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]*)$/);
    if (!match) return word;
    const prefix = match[1];
    const core = match[2];
    const suffix = match[3];
    if (core.length <= 3) return word;
    const syllables = syllabifyFrenchWord(core);
    if (syllables.length <= 1) return word;
    return (
      <span className="inline-flex items-baseline">
        {prefix}
        {syllables.map((s, idx) => (
          <span
            key={idx}
            className={idx % 2 === 0 ? 'text-indigo-900 font-semibold' : 'text-rose-600 font-bold'}
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
    const rawWords = content.trim().split(/\s+/);
    const tokenMap = new Map<number, AlignedToken>();

    if (annotatedTokens) {
      annotatedTokens.forEach((t) => tokenMap.set(t.expectedIndex, t));
    }

    const chunks: LineChunk[] = [];
    const WORDS_PER_LINE = 10;
    let currentWords: LineChunk['words'] = [];
    let cumulative = 0;
    let tokenCounter = 0;

    for (let i = 0; i < rawWords.length; i++) {
      const word = rawWords[i];
      const subTokens = tokenizeFrenchText(word);
      tokenCounter += subTokens.length;
      cumulative += subTokens.length;

      const matchedToken = tokenMap.get(tokenCounter - subTokens.length);

      currentWords.push({
        original: word,
        clean: subTokens.map((st) => st.clean).join(' '),
        tokenIndex: tokenCounter - subTokens.length,
        annotated: matchedToken,
      });

      if (currentWords.length >= WORDS_PER_LINE || i === rawWords.length - 1) {
        chunks.push({
          words: currentWords,
          cumulativeCount: cumulative,
        });
        currentWords = [];
      }
    }

    return chunks;
  }, [content, annotatedTokens]);

  const handleWordClick = (item: LineChunk['words'][0]) => {
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
      className={`bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 transition-all ${
        dyslexicMode ? 'dys-mode' : ''
      }`}
    >
      {/* Panneau d'inspection détaillée du mot sélectionné */}
      {showResults && inspectedWord && (
        <div className="mb-6 p-4 sm:p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md animate-in fade-in duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                inspectedWord.status === 'correct'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : inspectedWord.status === 'error'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {inspectedWord.status === 'correct' ? '✓' : inspectedWord.status === 'error' ? '✕' : '⋯'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">
                  Mot : « {inspectedWord.expectedWord} »
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    inspectedWord.status === 'correct'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : inspectedWord.status === 'error'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {inspectedWord.status === 'correct'
                    ? 'Validé (positif)'
                    : inspectedWord.errorType === 'omission'
                    ? 'Omission (mot sauté)'
                    : inspectedWord.errorType === 'inversion'
                    ? 'Inversion'
                    : 'Erreur / substitution'}
                </span>
              </div>

              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {inspectedWord.spokenWord && (
                  <span>
                    Transcription IA : <strong className="text-amber-300">« {inspectedWord.spokenWord} »</strong>
                  </span>
                )}
                {inspectedWord.timestampMs !== undefined && (
                  <span className="text-slate-400 font-mono">
                    Position audio : {(inspectedWord.timestampMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions enseignant / vérification */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {inspectedWord.timestampMs !== undefined && onSeekAudioMs && (
              <button
                onClick={() => onSeekAudioMs(inspectedWord.timestampMs!)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Écouter le mot dans l'enregistrement de l'enfant"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Réécouter</span>
              </button>
            )}

            {onOverrideWordStatus && (
              <>
                {inspectedWord.status !== 'correct' ? (
                  <button
                    onClick={() => {
                      onOverrideWordStatus(inspectedWord.expectedIndex, 'correct');
                      setInspectedWord({ ...inspectedWord, status: 'correct' });
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    title="L'enfant a bien lu ce mot : corriger l'IA"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valider comme juste</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onOverrideWordStatus(inspectedWord.expectedIndex, 'error');
                      setInspectedWord({ ...inspectedWord, status: 'error', errorType: 'substitution' });
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    title="L'enfant a fait une erreur non détectée : corriger l'IA"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Compter en erreur</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => setInspectedWord(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Barre d'outils d'accessibilité de lecture */}
      {!showResults && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 text-xs">
          <span className="text-slate-400 font-medium hidden sm:inline">
            Repères de mots cumulés en marge droite (protocole ELFE)
          </span>
          <button
            onClick={() => setBicolorSyllables(!bicolorSyllables)}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              bicolorSyllables
                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Affiche les syllabes en couleurs alternées pour faciliter le décodage dyslexique"
          >
            <span>🎨 Syllabes bicolores (Dys)</span>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                bicolorSyllables ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-slate-300'
              }`}
            />
          </button>
        </div>
      )}

      {/* Rendu du texte avec indicateur de lecture audio synchronisée */}
      <div className="space-y-4">
        {lines.map((line, lineIdx) => (
          <div
            key={lineIdx}
            className="flex items-start justify-between gap-4 pb-2 border-b border-slate-100/60 last:border-b-0 hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
          >
            {/* Ligne de texte avec mots */}
            <div className="flex-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-2 reading-text-flow text-lg sm:text-2xl text-slate-800 font-medium">
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
                  showResults && inspectedWord && inspectedWord.expectedIndex === ann?.expectedIndex;

                if (showResults && ann) {
                  let styleClass = '';
                  let tooltip = '';

                  if (ann.status === 'correct') {
                    styleClass =
                      'bg-emerald-100/90 text-emerald-950 border-b-2 border-emerald-500 px-1.5 py-0.5 rounded-lg';
                    tooltip = `Correctement lu (${ann.timestampMs ? `${(ann.timestampMs / 1000).toFixed(1)}s` : ''}) - Cliquer pour écouter`;
                  } else if (ann.status === 'hesitation') {
                    styleClass =
                      'bg-amber-100 text-amber-950 border-b-2 border-amber-500 px-1.5 py-0.5 rounded-lg';
                    tooltip = `Hésitation > 3s ${ann.spokenWord ? `(dit: "${ann.spokenWord}")` : ''} - Cliquer pour écouter`;
                  } else if (ann.status === 'error') {
                    styleClass =
                      'bg-rose-100 text-rose-950 border-b-2 border-rose-500 px-1.5 py-0.5 rounded-lg';
                    tooltip =
                      ann.errorType === 'omission'
                        ? 'Omission (mot sauté) - Cliquer pour écouter'
                        : ann.errorType === 'inversion'
                        ? 'Inversion de mots - Cliquer pour écouter'
                        : `Substitution ${ann.spokenWord ? `(lu: "${ann.spokenWord}")` : ''} - Cliquer pour écouter`;
                  } else if (ann.status === 'unreached') {
                    styleClass = 'text-slate-400 opacity-50';
                    tooltip = 'Non atteint dans les 60s';
                  }

                  return (
                    <span
                      key={wIdx}
                      title={tooltip}
                      onClick={() => handleWordClick(item)}
                      className={`inline-block cursor-pointer transition-all duration-150 relative ${styleClass} ${
                        isCurrentlyPlayingAudio
                          ? 'ring-4 ring-indigo-500 ring-offset-2 scale-110 font-black shadow-md z-10'
                          : isInspected
                          ? 'ring-2 ring-slate-900 ring-offset-1'
                          : 'hover:scale-105'
                      }`}
                    >
                      {item.original}
                    </span>
                  );
                }

                // Mode lecture simple
                const isCurrent = activeWordIndex === item.tokenIndex;

                return (
                  <span
                    key={wIdx}
                    onClick={() => handleWordClick(item)}
                    className={`inline-block cursor-pointer transition-colors hover:text-indigo-600 ${
                      isCurrent
                        ? 'bg-amber-200 text-amber-950 px-1 rounded-sm shadow-xs'
                        : ''
                    }`}
                  >
                    {renderWordContent(item.original, bicolorSyllables)}
                  </span>
                );
              })}
            </div>

            {/* Repère de mots cumulés en marge droite (norme ELFE) */}
            <div className="shrink-0 w-12 sm:w-16 text-right select-none pt-1">
              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs sm:text-sm font-mono font-bold">
                {line.cumulativeCount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showResults && (
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">Légende :</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-200 border border-emerald-500 inline-block" />
              <span>Vert : Mot bien lu (vrai positif)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-200 border border-rose-500 inline-block" />
              <span>Rouge : Erreur / Omission (négatif)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-200 border border-amber-500 inline-block" />
              <span>Orange : Hésitation &gt; 3s</span>
            </span>
          </div>

          <div className="text-xs text-indigo-600 font-medium flex items-center gap-1">
            <Headphones className="w-4 h-4" />
            <span>Clique sur n'importe quel mot pour réécouter et vérifier la décision de l'IA</span>
          </div>
        </div>
      )}
    </div>
  );
};
