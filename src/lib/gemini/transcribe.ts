import { normalizeWord } from "../utils";
import { getGenAIClient } from "./client";

export interface TranscribedWord {
  cleanText: string;
  endMs: number;
  speaker?: string;
  startMs: number;
  text: string;
}

export interface TranscriptionResult {
  durationMs: number;
  fullText: string;
  words: TranscribedWord[];
}

const WHITESPACE_REGEX = /\s+/u;

export const blobToBase64 = (blob: Blob): Promise<string> => {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onloadend = () => {
    const res = reader.result as string;
    const [, base64 = ""] = res.split(",");
    resolve(base64);
  };
  reader.onerror = reject;
  reader.readAsDataURL(blob);
  return promise;
};

/**
 * Convertit un offset de temps (ex: "1.250s", "1250ms", ou 1250) en millisecondes
 */
const parseOffsetToMs = (
  offset: string | number | undefined | null,
  fallbackMs = 0
): number => {
  if (offset === undefined || offset === null) {
    return fallbackMs;
  }
  if (typeof offset === "number") {
    return offset > 1000 && offset < 100_000
      ? Math.round(offset)
      : Math.round(offset * 1000);
  }
  const str = String(offset).trim().toLowerCase();
  if (str.endsWith("ms")) {
    return Math.round(Number.parseFloat(str.replace("ms", ""))) || fallbackMs;
  }
  if (str.endsWith("s")) {
    return Math.round((Number.parseFloat(str.replace("s", "")) || 0) * 1000);
  }
  const num = Number.parseFloat(str);
  return Number.isNaN(num) ? fallbackMs : Math.round(num * 1000);
};

/**
 * Nettoie le type MIME pour l'API Google (ex: "audio/webm;codecs=opus" -> "audio/webm")
 */
const sanitizeAudioMimeType = (rawMime: string): string => {
  const base = (rawMime || "audio/webm").split(";")[0].trim().toLowerCase();
  if (base.includes("webm")) {
    return "audio/webm";
  }
  if (base.includes("ogg")) {
    return "audio/ogg";
  }
  if (base.includes("wav")) {
    return "audio/wav";
  }
  if (base.includes("mp4") || base.includes("m4a")) {
    return "audio/mp4";
  }
  if (base.includes("mp3") || base.includes("mpeg")) {
    return "audio/mp3";
  }
  return "audio/webm";
};

interface AudioWord {
  end_offset?: string | number;
  endOffset?: string | number;
  speaker?: string;
  start_offset?: string | number;
  startOffset?: string | number;
  text?: string;
  word?: string;
}

interface AudioTranscriptionData {
  speaker_label?: string;
  speakerLabel?: string;
  words?: AudioWord[];
}

interface WordAnnotation {
  end_offset?: string | number;
  endOffset?: string | number;
  speaker?: string;
  start_offset?: string | number;
  startOffset?: string | number;
  text?: string;
  word?: string;
  word_info?: AudioWord;
  wordInfo?: AudioWord;
}

interface PartData {
  annotations?: WordAnnotation[];
  audio_transcription?: AudioTranscriptionData;
  audioTranscription?: AudioTranscriptionData;
  text?: string;
}

interface CandidateData {
  annotations?: WordAnnotation[];
  content?: {
    parts?: PartData[];
  };
}

interface TranscriptionApiResponse {
  candidates?: CandidateData[];
}

const extractWordsFromAudioTranscription = (
  audioTranscription: AudioTranscriptionData | undefined,
  targetWords: TranscribedWord[]
): void => {
  if (!(audioTranscription && Array.isArray(audioTranscription.words))) {
    return;
  }
  for (const item of audioTranscription.words) {
    const rawWord = item.word || item.text;
    if (rawWord) {
      const startMs = parseOffsetToMs(item.startOffset ?? item.start_offset, 0);
      const endMs = parseOffsetToMs(
        item.endOffset ?? item.end_offset,
        startMs + 350
      );
      targetWords.push({
        cleanText: normalizeWord(rawWord),
        endMs,
        speaker:
          audioTranscription.speakerLabel || audioTranscription.speaker_label,
        startMs,
        text: rawWord,
      });
    }
  }
};

const extractWordsFromAnnotations = (
  annotations: WordAnnotation[] | undefined,
  targetWords: TranscribedWord[]
): void => {
  if (!(annotations && Array.isArray(annotations))) {
    return;
  }
  for (const ann of annotations) {
    const wordInfo = ann.wordInfo || ann.word_info || ann;
    if (wordInfo.text || wordInfo.word) {
      const rawWord = wordInfo.word || wordInfo.text || "";
      const startMs = parseOffsetToMs(
        wordInfo.startOffset ?? wordInfo.start_offset,
        0
      );
      const endMs = parseOffsetToMs(
        wordInfo.endOffset ?? wordInfo.end_offset,
        startMs + 350
      );
      targetWords.push({
        cleanText: normalizeWord(rawWord),
        endMs,
        speaker: wordInfo.speaker,
        startMs,
        text: rawWord,
      });
    }
  }
};

const splitFullTextIntoWords = (fullText: string): TranscribedWord[] => {
  const result: TranscribedWord[] = [];
  const rawList = fullText.trim().split(WHITESPACE_REGEX);
  let currentMs = 400;
  for (const item of rawList) {
    const clean = normalizeWord(item);
    if (clean) {
      result.push({
        cleanText: clean,
        endMs: currentMs + 400,
        startMs: currentMs,
        text: item,
      });
      currentMs += 480;
    }
  }
  return result;
};

/**
 * Extrait les mots et timestamps du format de réponse de l'API de transcription
 */
const extractTranscribedWordsFromResponse = (
  response: TranscriptionApiResponse
): TranscriptionResult => {
  const words: TranscribedWord[] = [];
  let fullText = "";

  const candidates = response.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (typeof part.text === "string" && part.text.trim()) {
        fullText = fullText
          ? `${fullText} ${part.text.trim()}`
          : part.text.trim();
      }

      extractWordsFromAudioTranscription(
        part.audioTranscription || part.audio_transcription,
        words
      );
      extractWordsFromAnnotations(
        part.annotations || candidate.annotations,
        words
      );
    }
  }

  // Si pas d'annotations de timestamps directes trouvées, découper le texte complet retourné
  if (words.length === 0 && fullText.trim()) {
    words.push(...splitFullTextIntoWords(fullText));
  }

  if (!fullText.trim() && words.length > 0) {
    fullText = words.map((w) => w.text).join(" ");
  }

  const durationMs =
    words.length > 0 ? (words.at(-1)?.endMs ?? 60_000) : 60_000;
  return {
    durationMs,
    fullText,
    words,
  };
};

interface FallbackJsonWord {
  endSec?: number;
  startSec?: number;
  word?: string;
}

interface FallbackJsonResponse {
  fullTranscript?: string;
  words?: FallbackJsonWord[];
}

/**
 * Fallback de transcription audio haute précision via gemini-3.8-flash avec timestamps JSON
 */
const fallbackTranscribeWithGeminiFlash = async (
  base64Audio: string,
  mimeType: string,
  customVocabulary: string[]
): Promise<TranscriptionResult> => {
  const client = await getGenAIClient();
  const vocabSample = customVocabulary.slice(0, 150);

  const prompt = `Tu es un transcripteur phonétique rigoureux pour l'évaluation de lecture d'enfants (protocole de fluence ELFE).
Transcris mot à mot tout ce qui a été prononcé dans cet enregistrement audio en français.
Conserve toutes les hésitations, répétitions et erreurs de lecture (mode verbatim). Ne corrige pas les fautes de prononciation.
Vocabulaire attendu dans le texte support (repères lexicaux) : ${vocabSample.join(", ")}.

Retourne UNIQUEMENT un JSON strict avec la liste chronologique des mots prononcés et leurs timestamps en secondes :
{
  "fullTranscript": "le texte complet prononcé...",
  "words": [
    { "word": "Au", "startSec": 0.5, "endSec": 0.8 },
    { "word": "sommet", "startSec": 0.9, "endSec": 1.4 }
  ]
}`;

  const response = await client.models.generateContent({
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
    contents: [
      {
        inlineData: {
          data: base64Audio,
          mimeType,
        },
      },
      {
        text: prompt,
      },
    ],
    model: "gemini-3.8-flash",
  });

  const text = response.text || "";
  try {
    const parsed = JSON.parse(text) as FallbackJsonResponse;
    const words: TranscribedWord[] = (parsed.words || []).map(
      (w, idx: number) => {
        const rawWord = w.word || "";
        const startMs =
          typeof w.startSec === "number"
            ? Math.round(w.startSec * 1000)
            : idx * 500;
        const endMs =
          typeof w.endSec === "number"
            ? Math.round(w.endSec * 1000)
            : startMs + 400;
        return {
          cleanText: normalizeWord(rawWord),
          endMs,
          startMs,
          text: rawWord,
        };
      }
    );

    const durationMs =
      words.length > 0 ? (words.at(-1)?.endMs ?? 60_000) : 60_000;
    return {
      durationMs,
      fullText: parsed.fullTranscript || words.map((w) => w.text).join(" "),
      words,
    };
  } catch (error) {
    console.error("Erreur de parsing fallback transcript:", error, text);
    throw new Error("Impossible de décoder la transcription audio.", {
      cause: error,
    });
  }
};

/**
 * Transcrit l'enregistrement audio de l'élève avec gemini-3.5-transcribe
 * Schéma officiel generateContent :
 * audioTranscriptionConfig: { languageCodes: ['fr-FR'], wordTimestamp: true }
 */
export const transcribeAudioWithGemini = async (
  audioBlob: Blob,
  expectedTokens: string[] = []
): Promise<TranscriptionResult> => {
  const client = await getGenAIClient();
  const base64Audio = await blobToBase64(audioBlob);
  const mimeType = sanitizeAudioMimeType(audioBlob.type);

  // 1. Tenter l'appel avec le modèle officiel gemini-3.5-transcribe
  try {
    // Configuration conforme aux spécifications de l'API Google generateContent
    const transcribeConfig = {
      audioTranscriptionConfig: {
        languageCodes: ["fr-FR"],
        wordTimestamp: true,
      },
    };

    const response = await client.models.generateContent({
      config: transcribeConfig,
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType,
          },
        },
      ],
      model: "gemini-3.5-transcribe",
    });

    const parsed = extractTranscribedWordsFromResponse(
      response as unknown as TranscriptionApiResponse
    );
    if (parsed.words.length > 0 || parsed.fullText.trim().length > 0) {
      return parsed;
    }
  } catch (error: unknown) {
    console.warn(
      "Échec ou non-disponibilité directe de gemini-3.5-transcribe, bascule vers mode multimodal fallback :",
      error
    );
  }

  // 2. Fallback robuste via gemini-3.8-flash (audio multimodal avec sortie structurée timestamps)
  return fallbackTranscribeWithGeminiFlash(
    base64Audio,
    mimeType,
    expectedTokens
  );
};
