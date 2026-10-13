import type { FluencyAttempt } from "@/db/db";

import type { TranscribedWord } from "./gemini/transcribe";
import { normalizeWord } from "./utils";

export interface AlignmentOptions {
  hesitationThresholdMs?: number; // 3 000 ms par défaut
  maxDurationMs?: number; // 60 000 ms par défaut
}

export interface AlignedToken {
  errorType?: "substitution" | "omission" | "inversion" | "hesitation";
  expectedIndex: number;
  expectedWord: string;
  spokenWord?: string;
  status: "correct" | "error" | "hesitation" | "unreached";
  timestampMs?: number;
}

export interface AlignmentResult {
  alignedTokens: AlignedToken[];
  attempt: FluencyAttempt;
  errorsCount: number;
  mclm: number;
  wordsAttempted: number;
}

/**
 * Distance de Levenshtein entre deux chaînes normalisées
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) {
    return n;
  }
  if (n === 0) {
    return m;
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // suppression
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calcule la similarité entre 0 et 1 entre deux mots
 */
function wordSimilarity(w1: string, w2: string): number {
  const s1 = normalizeWord(w1);
  const s2 = normalizeWord(w2);
  if (s1 === s2) {
    return 1;
  }
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) {
    return 1;
  }
  const dist = levenshteinDistance(s1, s2);
  return 1 - dist / maxLen;
}

/**
 * Moteur d'alignement phonétique et textuel ELFE
 */
export function alignFluencyReading(
  expectedTokens: string[],
  spokenWords: TranscribedWord[],
  options: AlignmentOptions = {}
): AlignmentResult {
  const maxDurationMs = options.maxDurationMs ?? 60_000;
  const hesitationThresholdMs = options.hesitationThresholdMs ?? 3000;

  // 1. Filtrer les mots prononcés dans les 60 secondes (T <= 60 000 ms)
  const validSpoken = spokenWords.filter(
    (w) => (w.startMs || 0) <= maxDurationMs
  );

  // Traiter les autocorrelations et répétitions consécutives dans les mots prononcés
  // Exemple : "le... le vieux" -> répétition tolérée
  // Exemple : "somm... sommet" -> autocorrection tolérée
  const cleanedSpoken: TranscribedWord[] = [];
  for (const current of validSpoken) {
    const prev = cleanedSpoken.at(-1);

    if (prev && normalizeWord(current.text) === normalizeWord(prev.text)) {
      continue; // tolérance ELFE : répéter ne pénalise pas
    }
    cleanedSpoken.push(current);
  }

  const M = expectedTokens.length;
  const N = cleanedSpoken.length;

  if (M === 0) {
    return {
      alignedTokens: [],
      attempt: {
        durationSeconds: 0,
        errorDetails: [],
        errorsCount: 0,
        lastWordReachedIndex: 0,
        mclm: 0,
        stumbledWords: [],
        timestamp: Date.now(),
        wordsAttempted: 0,
      },
      errorsCount: 0,
      mclm: 0,
      wordsAttempted: 0,
    };
  }

  // 2. Programmation dynamique d'alignement (Needleman-Wunsch adapté)
  // Matrice de score d'alignement
  const MATCH_SCORE = 3;
  const MISMATCH_SCORE = -2;
  const GAP_EXPECTED = -2; // Omission
  const GAP_SPOKEN = -1; // Mot rajouté / hésitation

  const dp: number[][] = Array.from({ length: M + 1 }, () =>
    new Array(N + 1).fill(0)
  );

  for (let i = 0; i <= M; i++) {
    dp[i][0] = i * GAP_EXPECTED;
  }
  for (let j = 0; j <= N; j++) {
    dp[0][j] = j * GAP_SPOKEN;
  }

  for (let i = 1; i <= M; i++) {
    const exp = expectedTokens[i - 1];
    for (let j = 1; j <= N; j++) {
      const spk = cleanedSpoken[j - 1].cleanText;
      const sim = wordSimilarity(exp, spk);
      const score = sim >= 0.85 ? MATCH_SCORE : sim >= 0.5 ? 1 : MISMATCH_SCORE;

      dp[i][j] = Math.max(
        dp[i - 1][j - 1] + score, // Alignement (match ou substitution)
        dp[i - 1][j] + GAP_EXPECTED, // Omission du mot attendu
        dp[i][j - 1] + GAP_SPOKEN // Insertion mot prononcé
      );
    }
  }

  // 3. Backtracking pour reconstruire l'alignement
  let i = M;
  let j = N;
  const rawPairs: { expIdx: number; spkIdx: number | null }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const exp = expectedTokens[i - 1];
      const spk = cleanedSpoken[j - 1].cleanText;
      const sim = wordSimilarity(exp, spk);
      const score = sim >= 0.85 ? MATCH_SCORE : sim >= 0.5 ? 1 : MISMATCH_SCORE;

      if (dp[i][j] === dp[i - 1][j - 1] + score) {
        rawPairs.unshift({ expIdx: i - 1, spkIdx: j - 1 });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + GAP_EXPECTED)) {
      rawPairs.unshift({ expIdx: i - 1, spkIdx: null });
      i--;
    } else {
      j--;
    }
  }

  // 4. Identifier le dernier mot atteint (index le plus élevé aligné avec un mot prononcé dans les 60s)
  let lastReachedExpIdx = -1;
  for (const pair of rawPairs) {
    if (pair.spkIdx !== null) {
      lastReachedExpIdx = Math.max(lastReachedExpIdx, pair.expIdx);
    }
  }

  // Si l'enfant n'a rien lu ou n'a pas été capté
  if (lastReachedExpIdx === -1 && cleanedSpoken.length > 0) {
    lastReachedExpIdx = Math.min(cleanedSpoken.length - 1, M - 1);
  }

  // 5. Analyse des erreurs ELFE selon la taxonomie officielle
  const alignedTokens: AlignedToken[] = [];
  const errorDetails: FluencyAttempt["errorDetails"] = [];
  const stumbledWordsSet = new Set<string>();

  // Détecter aussi les hésitations (pauses > 3s)
  for (let k = 1; k < cleanedSpoken.length; k++) {
    const pause =
      (cleanedSpoken[k].startMs || 0) - (cleanedSpoken[k - 1].endMs || 0);
    if (pause >= hesitationThresholdMs) {
      // Hésitation avant cleanedSpoken[k]
      const matchingPair = rawPairs.find((p) => p.spkIdx === k);
      if (matchingPair) {
        const word = expectedTokens[matchingPair.expIdx];
        stumbledWordsSet.add(word);
      }
    }
  }

  // Vérification des inversions de mots adjacents (ex: "grand chien" prononcé "chien grand")
  const invertedIndices = new Set<number>();
  for (let p = 0; p < rawPairs.length - 1; p++) {
    const curr = rawPairs[p];
    const next = rawPairs[p + 1];
    if (curr.spkIdx !== null && next.spkIdx !== null) {
      const exp1 = expectedTokens[curr.expIdx];
      const exp2 = expectedTokens[next.expIdx];
      const spk1 = cleanedSpoken[curr.spkIdx].cleanText;
      const spk2 = cleanedSpoken[next.spkIdx].cleanText;

      if (
        wordSimilarity(exp1, spk2) >= 0.85 &&
        wordSimilarity(exp2, spk1) >= 0.85
      ) {
        invertedIndices.add(curr.expIdx);
        invertedIndices.add(next.expIdx);
        errorDetails.push({
          expectedWord: `${exp1} ${exp2}`,
          spokenWord: `${spk1} ${spk2}`,
          timestampOffsetMs: cleanedSpoken[curr.spkIdx].startMs,
          type: "inversion",
        });
        stumbledWordsSet.add(exp1);
        stumbledWordsSet.add(exp2);
      }
    }
  }

  let errorsCount = 0;

  for (let expIdx = 0; expIdx < M; expIdx++) {
    const expectedWord = expectedTokens[expIdx];

    // Mot au-delà de la borne des 60s -> Non atteint
    if (expIdx > lastReachedExpIdx) {
      alignedTokens.push({
        expectedIndex: expIdx,
        expectedWord,
        status: "unreached",
      });
      continue;
    }

    // Mot déjà compté dans une inversion
    if (invertedIndices.has(expIdx)) {
      alignedTokens.push({
        errorType: "inversion",
        expectedIndex: expIdx,
        expectedWord,
        status: "error",
      });
      continue;
    }

    const pair = rawPairs.find((p) => p.expIdx === expIdx);

    if (!pair || pair.spkIdx === null) {
      // Omission : mot sauté dans l'intervalle atteint
      errorsCount++;
      alignedTokens.push({
        errorType: "omission",
        expectedIndex: expIdx,
        expectedWord,
        status: "error",
      });
      errorDetails.push({
        expectedWord,
        type: "omission",
      });
      stumbledWordsSet.add(expectedWord);
      continue;
    }

    const spokenObj = cleanedSpoken[pair.spkIdx];
    const spokenClean = spokenObj.cleanText;
    const sim = wordSimilarity(expectedWord, spokenClean);

    // Vérifier si une hésitation majeure (> 3s) s'est produite
    const wordDuration = (spokenObj.endMs || 0) - (spokenObj.startMs || 0);
    const hasLongHesitation = wordDuration >= hesitationThresholdMs;

    if (sim >= 0.8) {
      // Mot correctement lu !
      if (hasLongHesitation) {
        // Blocage / hésitation > 3s comptabilisée en erreur ELFE
        errorsCount++;
        alignedTokens.push({
          errorType: "hesitation",
          expectedIndex: expIdx,
          expectedWord,
          spokenWord: spokenObj.text,
          status: "hesitation",
          timestampMs: spokenObj.startMs,
        });
        errorDetails.push({
          expectedWord,
          spokenWord: spokenObj.text,
          timestampOffsetMs: spokenObj.startMs,
          type: "hesitation",
        });
        stumbledWordsSet.add(expectedWord);
      } else {
        alignedTokens.push({
          expectedIndex: expIdx,
          expectedWord,
          spokenWord: spokenObj.text,
          status: "correct",
          timestampMs: spokenObj.startMs,
        });
      }
    } else {
      // Substitution : mot mal décodé ou remplacé
      errorsCount++;
      alignedTokens.push({
        errorType: "substitution",
        expectedIndex: expIdx,
        expectedWord,
        spokenWord: spokenObj.text,
        status: "error",
        timestampMs: spokenObj.startMs,
      });
      errorDetails.push({
        expectedWord,
        spokenWord: spokenObj.text,
        timestampOffsetMs: spokenObj.startMs,
        type: "substitution",
      });
      stumbledWordsSet.add(expectedWord);
    }
  }

  // Nombre de mots cibles tentés dans les 60s
  const wordsAttempted = lastReachedExpIdx >= 0 ? lastReachedExpIdx + 1 : 0;

  // Formule ELFE : MCLM = Mots Totaux Lus en 60s - Erreurs
  const mclm = Math.max(0, wordsAttempted - errorsCount);

  // Isoler entre 3 et 5 mots-clés problématiques pour la remédiation (sans les mots trop courts comme "de", "le")
  const meaningfulStumbled = [...stumbledWordsSet]
    .filter((w) => w.length >= 3)
    .slice(0, 5);

  // Si moins de 3 mots, compléter si besoin avec d'autres mots butés
  const stumbledWords =
    meaningfulStumbled.length >= 3
      ? meaningfulStumbled
      : [...stumbledWordsSet].slice(0, 5);

  const durationSeconds = Math.min(
    60,
    cleanedSpoken.length > 0
      ? Math.round((cleanedSpoken.at(-1)?.endMs || 60_000) / 1000)
      : 60
  );

  const attempt: FluencyAttempt = {
    annotatedWords: alignedTokens.map((t) => ({
      expectedIndex: t.expectedIndex,
      spoken: t.spokenWord,
      status: t.status,
      word: t.expectedWord,
    })),
    durationSeconds: Math.max(1, durationSeconds),
    errorDetails,
    errorsCount,
    lastWordReachedIndex: lastReachedExpIdx,
    mclm,
    stumbledWords,
    timestamp: Date.now(),
    wordsAttempted,
  };

  return {
    alignedTokens,
    attempt,
    errorsCount,
    mclm,
    wordsAttempted,
  };
}
