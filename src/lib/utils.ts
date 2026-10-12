import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalise un mot pour la comparaison phonétique et d'alignement :
 * - Minuscules
 * - Suppression de la ponctuation finale/initiale
 * - Conservation des accents français (ou tolérance facultative)
 */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"«»'’]/g, '')
    .trim();
}

/**
 * Découpe un texte français en tokens exploitables pour l'alignement et le comptage.
 * Préserve la correspondance avec le texte original tout en fournissant les tokens nettoyés.
 */
export function tokenizeFrenchText(text: string): { original: string; clean: string; index: number }[] {
  // Découpage sur les espaces et les retours à la ligne
  const rawWords = text.trim().split(/\s+/);
  const result: { original: string; clean: string; index: number }[] = [];

  let idx = 0;
  for (const raw of rawWords) {
    if (!raw) continue;
    // Vérifier si le mot contient une apostrophe élidée (ex: l'arbre, d'un, qu'il)
    // En français, l'élision sépare souvent deux mots de lecture
    const elisionMatch = raw.match(/^([ldnqscmjLDNQSCMJ]['’])(.+)$/);
    if (elisionMatch) {
      const part1 = elisionMatch[1];
      const part2 = elisionMatch[2];
      const clean1 = normalizeWord(part1);
      const clean2 = normalizeWord(part2);
      if (clean1) {
        result.push({ original: part1, clean: clean1, index: idx++ });
      }
      if (clean2) {
        result.push({ original: part2, clean: clean2, index: idx++ });
      }
    } else {
      const clean = normalizeWord(raw);
      if (clean) {
        result.push({ original: raw, clean, index: idx++ });
      }
    }
  }

  return result;
}

/**
 * Repères attendus ELFE / Éduscol en Mots Correctement Lus par Minute (MCLM)
 */
export const FLUENCY_NORMS = {
  CE1: { min: 50, target: 70, label: 'CE1 (50 - 70 MCLM)' },
  CE2: { min: 75, target: 90, label: 'CE2 (75 - 90 MCLM)' },
  CM1: { min: 90, target: 110, label: 'CM1 (90 - 110 MCLM)' },
  CM2: { min: 110, target: 130, label: 'CM2 (110 - 130 MCLM)' },
} as const;
