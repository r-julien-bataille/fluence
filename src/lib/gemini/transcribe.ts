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

      const countBefore = words.length;
      extractWordsFromAudioTranscription(
        part.audioTranscription || part.audio_transcription,
        words
      );
      if (words.length === countBefore) {
        extractWordsFromAnnotations(part.annotations, words);
      }
    }

    if (words.length === 0 && candidate.annotations) {
      extractWordsFromAnnotations(candidate.annotations, words);
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

/**
 * Transcrit l'enregistrement audio de l'élève avec gemini-3.5-transcribe
 * Schéma officiel generateContent :
 * audioTranscriptionConfig: { languageCodes: ['fr-FR'], wordTimestamp: true, diarization: false }
 * Note : customVocabulary n'est pas utilisé car l'API interdit de le combiner avec wordTimestamp: true.
 */
export const transcribeAudioWithGemini = async (
  audioBlob: Blob
): Promise<TranscriptionResult> => {
  const [client, base64Audio] = await Promise.all([
    getGenAIClient(),
    blobToBase64(audioBlob),
  ]);
  const mimeType = sanitizeAudioMimeType(audioBlob.type);

  const response = await client.models.generateContent({
    config: {
      audioTranscriptionConfig: {
        diarization: false,
        languageCodes: ["fr-FR"],
        wordTimestamp: true,
      },
    },
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

  return extractTranscribedWordsFromResponse(
    response as unknown as TranscriptionApiResponse
  );
};
