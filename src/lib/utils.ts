import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const PUNCTUATION_REGEX = /[.,/#!$%^&*;:{}=\-_`~()?"«»'’]/gu;
const WHITESPACE_REGEX = /\s+/u;
const ELISION_REGEX = /^(?<prefix>[ldnqscmjLDNQSCMJ]['’])(?<rest>.+)$/u;

/**
 * Normalise un mot pour la comparaison phonétique et d'alignement :
 * - Minuscules
 * - Suppression de la ponctuation finale/initiale
 * - Conservation des accents français (ou tolérance facultative)
 */
export const normalizeWord = (word: string): string =>
  word.toLowerCase().replaceAll(PUNCTUATION_REGEX, "").trim();

/**
 * Découpe un texte français en tokens exploitables pour l'alignement et le comptage.
 * Préserve la correspondance avec le texte original tout en fournissant les tokens nettoyés.
 */
export const tokenizeFrenchText = (
  text: string
): { original: string; clean: string; index: number }[] => {
  // Découpage sur les espaces et les retours à la ligne
  const rawWords = text.trim().split(WHITESPACE_REGEX);
  const result: { original: string; clean: string; index: number }[] = [];

  let idx = 0;
  for (const raw of rawWords) {
    if (!raw) {
      continue;
    }
    // Vérifier si le mot contient une apostrophe élidée (ex: l'arbre, d'un, qu'il)
    // En français, l'élision sépare souvent deux mots de lecture
    const elisionMatch = raw.match(ELISION_REGEX);
    if (elisionMatch) {
      const [, part1 = "", part2 = ""] = elisionMatch;
      const clean1 = normalizeWord(part1);
      const clean2 = normalizeWord(part2);
      if (clean1) {
        result.push({ clean: clean1, index: idx, original: part1 });
        idx += 1;
      }
      if (clean2) {
        result.push({ clean: clean2, index: idx, original: part2 });
        idx += 1;
      }
    } else {
      const clean = normalizeWord(raw);
      if (clean) {
        result.push({ clean, index: idx, original: raw });
        idx += 1;
      }
    }
  }

  return result;
};

/**
 * Repères attendus ELFE / Éduscol en Mots Correctement Lus par Minute (MCLM)
 */
export const FLUENCY_NORMS = {
  CE1: { label: "CE1 (50 - 70 MCLM)", min: 50, target: 70 },
  CE2: { label: "CE2 (75 - 90 MCLM)", min: 75, target: 90 },
  CM1: { label: "CM1 (90 - 110 MCLM)", min: 90, target: 110 },
  CM2: { label: "CM2 (110 - 130 MCLM)", min: 110, target: 130 },
} as const;
