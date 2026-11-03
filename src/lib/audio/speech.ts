export interface SyllableToken {
  isHyphen: boolean;
  text: string;
}

const HYPHEN_REGEX = /(?<hyphen>[-\u2011\u2013])/u;

/**
 * Découpe un mot ou un mot composé en tokens de syllabes et de tirets.
 * Préserve intégralement les tirets d'origine (ex: "matin-là" -> ["ma", "tin", "-", "là"]).
 */
export function getWordSyllableTokens(word: string): SyllableToken[] {
  const clean = word.trim();
  if (!clean) {
    return [];
  }

  const segments = clean.split(HYPHEN_REGEX);
  const tokens: SyllableToken[] = [];

  for (const seg of segments) {
    if (!seg) {
      continue;
    }
    if (HYPHEN_REGEX.test(seg)) {
      tokens.push({ isHyphen: true, text: seg });
    } else if (seg.length > 3) {
      const syls = syllabifyFrenchWord(seg);
      for (const s of syls) {
        tokens.push({ isHyphen: false, text: s });
      }
    } else {
      tokens.push({ isHyphen: false, text: seg });
    }
  }

  return tokens;
}

/**
 * Découpage heuristique élémentaire de mots français en syllabes pour faciliter la remédiation
 */
export function syllabifyFrenchWord(word: string): string[] {
  const clean = word.trim();
  if (clean.length <= 3) {
    return [clean];
  }

  if (clean.includes("-")) {
    const parts = clean.split("-").filter(Boolean);
    return parts.flatMap((part) => syllabifyFrenchWord(part));
  }

  const vowels = "[aeiouyàâäéèêëîïôöùûüœæ]";
  const consonants = "[bcçdfghjklmnpqrstvwxz]";

  // Séparer les doubles consonnes identiques (ex: ap-pel, vil-le) en conservant la casse
  let syll = clean.replaceAll(
    /(?<char>[bcdfghjklmnpqrstvwxz])\k<char>/giu,
    (match) => `${match[0]}-${match[1]}`
  );

  // Séparer consonne + consonne sauf liquides
  const regexCC = new RegExp(
    `(${vowels})(${consonants})(${consonants})(${vowels})`,
    "giu"
  );
  syll = syll.replace(regexCC, (_match, v1, c1, c2, v2) => {
    const pair = (c1 + c2).toLowerCase();
    const indivisible = [
      "bl",
      "br",
      "cl",
      "cr",
      "dr",
      "fl",
      "fr",
      "gl",
      "gr",
      "pl",
      "pr",
      "tr",
      "vr",
      "ch",
      "ph",
      "th",
      "gn",
    ];
    if (indivisible.includes(pair)) {
      return `${v1}-${c1}${c2}${v2}`;
    }
    return `${v1}${c1}-${c2}${v2}`;
  });

  // Séparer V-CV
  const regexVCV = new RegExp(`(${vowels})(${consonants})(${vowels})`, "giu");
  syll = syll.replace(regexVCV, "$1-$2$3");

  const parts = syll.split("-").filter(Boolean);
  return parts.length > 0 ? parts : [clean];
}

// Référence globale pour éviter le garbage collection sous Chrome/macOS
let _activeUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveTimer: number | null = null;
let cachedFrenchVoice: SpeechSynthesisVoice | null = null;

const SPEECH_VOICE_STORAGE_KEY = "FLUENCE_SPEECH_VOICE";

const PREFERRED_VOICE_NAMES = [
  "natural",
  "google français",
  "google francais",
  "amélie",
  "amelie",
  "thomas",
  "audrey",
  "aurélie",
  "aurelie",
  "virginie",
  "sébastien",
  "sebastien",
  "nicolas",
  "julie",
  "hortense",
  "fr-fr",
] as const;

export function getStoredVoiceURI(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(SPEECH_VOICE_STORAGE_KEY) ?? "";
}

export function setStoredVoiceURI(voiceURI: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = voiceURI.trim();
  if (trimmed) {
    localStorage.setItem(SPEECH_VOICE_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(SPEECH_VOICE_STORAGE_KEY);
  }
  cachedFrenchVoice = null;
}

export function isFrenchVoice(voice: SpeechSynthesisVoice): boolean {
  const l = (voice.lang || "").toLowerCase().replace("_", "-");
  const n = (voice.name || "").toLowerCase();
  return (
    l.startsWith("fr") ||
    l === "fra" ||
    l === "fre" ||
    n.includes("french") ||
    n.includes("français")
  );
}

export function getAvailableFrenchVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const frenchVoices: SpeechSynthesisVoice[] = [];
  for (const voice of voices) {
    if (isFrenchVoice(voice) && !seen.has(voice.voiceURI)) {
      seen.add(voice.voiceURI);
      frenchVoices.push(voice);
    }
  }

  return frenchVoices.sort((a, b) => {
    const aFrFR = a.lang.toLowerCase().replace("_", "-") === "fr-fr";
    const bFrFR = b.lang.toLowerCase().replace("_", "-") === "fr-fr";
    if (aFrFR !== bFrFR) {
      return aFrFR ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "fr");
  });
}

function selectBestFrenchVoice(
  frenchVoices: SpeechSynthesisVoice[],
  preferredVoiceURI?: string
): SpeechSynthesisVoice | null {
  if (frenchVoices.length === 0) {
    return null;
  }

  const targetURI = (preferredVoiceURI ?? getStoredVoiceURI()).trim();
  if (targetURI) {
    const chosen = frenchVoices.find(
      (v) => v.voiceURI === targetURI || v.name === targetURI
    );
    if (chosen) {
      return chosen;
    }
  }

  // Préférer une voix naturelle de haute qualité (Thomas, Amélie, Audrey, Google Français, etc.)
  for (const pref of PREFERRED_VOICE_NAMES) {
    const match = frenchVoices.find((v) => v.name.toLowerCase().includes(pref));
    if (match) {
      return match;
    }
  }

  // À défaut, toute voix française de France (fr-FR)
  const frFR = frenchVoices.find(
    (v) => v.lang.toLowerCase().replace("_", "-") === "fr-fr"
  );
  if (frFR) {
    return frFR;
  }

  // À défaut, n'importe quelle voix française
  return frenchVoices[0];
}

/**
 * Recherche et garantit la sélection d'une voix FRANÇAISE stricte
 */
export function getFrenchVoice(
  preferredVoiceURI?: string
): Promise<SpeechSynthesisVoice | null> {
  const effectiveURI = (preferredVoiceURI ?? getStoredVoiceURI()).trim();
  if (!effectiveURI && cachedFrenchVoice) {
    return Promise.resolve(cachedFrenchVoice);
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve(null);
  }

  const findVoice = (): SpeechSynthesisVoice | null => {
    const frenchVoices = getAvailableFrenchVoices();
    return selectBestFrenchVoice(frenchVoices, effectiveURI);
  };

  const immediate = findVoice();
  if (immediate) {
    if (!effectiveURI) {
      cachedFrenchVoice = immediate;
    }
    return Promise.resolve(immediate);
  }

  // Si getVoices() est encore vide (chargement asynchrone dans Chromium/Safari), attendre onvoiceschanged
  return new Promise((resolve) => {
    let resolved = false;

    const onVoicesChanged = () => {
      if (resolved) {
        return;
      }
      const v = findVoice();
      if (v) {
        resolved = true;
        if (!effectiveURI) {
          cachedFrenchVoice = v;
        }
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          onVoicesChanged
        );
        resolve(v);
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);

    // Timeout de sécurité 600ms
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          onVoicesChanged
        );
        const fallback = findVoice();
        if (!effectiveURI) {
          cachedFrenchVoice = fallback;
        }
        resolve(fallback);
      }
    }, 600);
  });
}

// Initialisation dès le chargement du module
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    getFrenchVoice().catch(console.debug);
  };
}

export interface SpeakOptions {
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onError?: () => void;
  pitch?: number;
  rate?: number;
  voiceURI?: string;
}

/**
 * Prononce un texte avec garantie absolue d'une voix française
 */
export async function speakFrenchText(
  text: string,
  options: SpeakOptions | number = {}
): Promise<void> {
  const opts: SpeakOptions =
    typeof options === "number" ? { rate: options } : options;
  const rate = opts.rate ?? 0.85;
  const pitch = opts.pitch ?? 1;

  if (!("speechSynthesis" in window)) {
    console.warn("Web Speech API non supportée sur ce navigateur.");
    return;
  }

  // Arrêter toute lecture précédente
  stopFrenchSpeech();

  const frenchVoice = await getFrenchVoice(opts.voiceURI);

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    _activeUtterance = utterance;

    // Forcer la langue et la voix française pour éviter la voix système par défaut
    utterance.lang = "fr-FR";
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    if (opts.onBoundary) {
      utterance.onboundary = (e) => {
        if (opts.onBoundary) {
          opts.onBoundary(e.charIndex);
        }
      };
    }

    const cleanup = () => {
      if (keepAliveTimer !== null) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      _activeUtterance = null;
    };

    utterance.onend = () => {
      cleanup();
      if (opts.onEnd) {
        opts.onEnd();
      }
      resolve();
    };

    utterance.onerror = () => {
      cleanup();
      if (opts.onError) {
        opts.onError();
      }
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
    }, 10_000);

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Met en pause la synthèse vocale en cours
 */
export function pauseFrenchSpeech(): void {
  if (
    "speechSynthesis" in window &&
    window.speechSynthesis.speaking &&
    !window.speechSynthesis.paused
  ) {
    window.speechSynthesis.pause();
  }
}

/**
 * Reprend la synthèse vocale mise en pause
 */
export function resumeFrenchSpeech(): void {
  if ("speechSynthesis" in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

/**
 * Arrête immédiatement la synthèse vocale en cours
 */
export function stopFrenchSpeech(): void {
  if ("speechSynthesis" in window) {
    if (keepAliveTimer !== null) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    _activeUtterance = null;
    window.speechSynthesis.cancel();
  }
}

/**
 * Joue un carillon doux via la Web Audio API pour signaler la fin des 60 secondes
 */
export function playChimeSound(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    // Bip doux harmonique double (523Hz C5 -> 659Hz E5)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // Do
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // Mi

    osc2.type = "triangle";
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
      ctx.close().catch(console.debug);
    }, 700);
  } catch (error) {
    console.debug("Chime sound error", error);
  }
}
