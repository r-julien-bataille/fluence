/**
 * Découpage heuristique élémentaire de mots français en syllabes pour faciliter la remédiation
 */
export function syllabifyFrenchWord(word: string): string[] {
  const clean = word.toLowerCase().trim();
  if (clean.length <= 3) return [clean];

  const vowels = '[aeiouyàâäéèêëîïôöùûü]';
  const consonants = '[bcçdfghjklmnpqrstvwxz]';

  // Séparer les doubles consonnes identiques (ex: ap-pel, vil-le)
  let syll = clean.replace(/([bcdfghjklmnpqrstvwxz])\1/gi, '$1-$1');

  // Séparer consonne + consonne sauf liquides
  const regexCC = new RegExp(`(${vowels})(${consonants})(${consonants})(${vowels})`, 'gi');
  syll = syll.replace(regexCC, (_match, v1, c1, c2, v2) => {
    const pair = (c1 + c2).toLowerCase();
    const indivisible = ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'vr', 'ch', 'ph', 'th', 'gn'];
    if (indivisible.includes(pair)) {
      return `${v1}-${c1}${c2}${v2}`;
    }
    return `${v1}${c1}-${c2}${v2}`;
  });

  // Séparer V-CV
  const regexVCV = new RegExp(`(${vowels})(${consonants})(${vowels})`, 'gi');
  syll = syll.replace(regexVCV, '$1-$2$3');

  const parts = syll.split('-').filter(Boolean);
  return parts.length > 0 ? parts : [clean];
}

// Référence globale pour éviter le garbage collection sous Chrome/macOS
let activeUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveTimer: number | null = null;
let cachedFrenchVoice: SpeechSynthesisVoice | null = null;

/**
 * Recherche et garantit la sélection d'une voix FRANÇAISE stricte
 */
export async function getFrenchVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cachedFrenchVoice) {
    return cachedFrenchVoice;
  }

  if (!('speechSynthesis' in window)) return null;

  const findVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Filtrer strictement toutes les voix françaises
    const frenchVoices = voices.filter((v) => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      const n = (v.name || '').toLowerCase();
      return (
        l.startsWith('fr') ||
        l === 'fra' ||
        l === 'fre' ||
        n.includes('french') ||
        n.includes('français')
      );
    });

    if (frenchVoices.length === 0) return null;

    // 2. Préférer une voix naturelle de haute qualité (Thomas, Amélie, Audrey, Google Français, etc.)
    const preferredNames = [
      'natural',
      'google français',
      'google francais',
      'amélie',
      'amelie',
      'thomas',
      'audrey',
      'aurélie',
      'aurelie',
      'virginie',
      'sébastien',
      'sebastien',
      'nicolas',
      'julie',
      'hortense',
      'fr-fr',
    ];

    for (const pref of preferredNames) {
      const match = frenchVoices.find((v) => v.name.toLowerCase().includes(pref));
      if (match) return match;
    }

    // 3. À défaut, toute voix française de France (fr-FR)
    const frFR = frenchVoices.find((v) => v.lang.toLowerCase().replace('_', '-') === 'fr-fr');
    if (frFR) return frFR;

    // 4. À défaut, n'importe quelle voix française
    return frenchVoices[0];
  };

  const immediate = findVoice();
  if (immediate) {
    cachedFrenchVoice = immediate;
    return immediate;
  }

  // Si getVoices() est encore vide (chargement asynchrone dans Chromium/Safari), attendre onvoiceschanged
  return new Promise((resolve) => {
    let resolved = false;

    const onVoicesChanged = () => {
      if (resolved) return;
      const v = findVoice();
      if (v) {
        resolved = true;
        cachedFrenchVoice = v;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(v);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

    // Timeout de sécurité 600ms
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        const fallback = findVoice();
        cachedFrenchVoice = fallback;
        resolve(fallback);
      }
    }, 600);
  });
}

// Initialisation dès le chargement du module
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    getFrenchVoice().catch(() => {});
  };
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * Prononce un texte avec garantie absolue d'une voix française
 */
export async function speakFrenchText(text: string, options: SpeakOptions | number = {}): Promise<void> {
  const opts: SpeakOptions = typeof options === 'number' ? { rate: options } : options;
  const rate = opts.rate ?? 0.85;
  const pitch = opts.pitch ?? 1.0;

  return new Promise(async (resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn("Web Speech API non supportée sur ce navigateur.");
      return resolve();
    }

    // Arrêter toute lecture précédente
    stopFrenchSpeech();

    const frenchVoice = await getFrenchVoice();

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance;

    // Forcer la langue et la voix française pour éviter la voix système par défaut
    utterance.lang = 'fr-FR';
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    if (opts.onBoundary) {
      utterance.onboundary = (e) => {
        if (opts.onBoundary) opts.onBoundary(e.charIndex);
      };
    }

    const cleanup = () => {
      if (keepAliveTimer !== null) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      activeUtterance = null;
    };

    utterance.onend = () => {
      cleanup();
      if (opts.onEnd) opts.onEnd();
      resolve();
    };

    utterance.onerror = () => {
      cleanup();
      if (opts.onError) opts.onError();
      resolve();
    };

    // Contournement du bug Chrome (qui met la parole en pause après 14 secondes pour les textes longs)
    keepAliveTimer = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        cleanup();
      } else if (!window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Met en pause la synthèse vocale en cours
 */
export function pauseFrenchSpeech(): void {
  if ('speechSynthesis' in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
  }
}

/**
 * Reprend la synthèse vocale mise en pause
 */
export function resumeFrenchSpeech(): void {
  if ('speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

/**
 * Arrête immédiatement la synthèse vocale en cours
 */
export function stopFrenchSpeech(): void {
  if ('speechSynthesis' in window) {
    if (keepAliveTimer !== null) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    activeUtterance = null;
    window.speechSynthesis.cancel();
  }
}

/**
 * Joue un carillon doux via la Web Audio API pour signaler la fin des 60 secondes
 */
export function playChimeSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    // Bip doux harmonique double (523Hz C5 -> 659Hz E5)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // Do
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // Mi

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.35); // Sol

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 700);
  } catch (_) {}
}
