import { getGenAIClient } from './client';
import { normalizeWord } from '../utils';

export interface TranscribedWord {
  text: string;
  cleanText: string;
  startMs: number;
  endMs: number;
  speaker?: string;
}

export interface TranscriptionResult {
  fullText: string;
  words: TranscribedWord[];
  durationMs: number;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convertit un offset de temps (ex: "1.250s", "1250ms", ou 1250) en millisecondes
 */
function parseOffsetToMs(offset: string | number | undefined | null, fallbackMs: number = 0): number {
  if (offset === undefined || offset === null) return fallbackMs;
  if (typeof offset === 'number') {
    return offset > 1000 && offset < 100000 ? Math.round(offset) : Math.round(offset * 1000);
  }
  const str = String(offset).trim().toLowerCase();
  if (str.endsWith('ms')) {
    return Math.round(parseFloat(str.replace('ms', ''))) || fallbackMs;
  }
  if (str.endsWith('s')) {
    return Math.round((parseFloat(str.replace('s', '')) || 0) * 1000);
  }
  const num = parseFloat(str);
  return isNaN(num) ? fallbackMs : Math.round(num * 1000);
}

/**
 * Nettoie le type MIME pour l'API Google (ex: "audio/webm;codecs=opus" -> "audio/webm")
 */
function sanitizeAudioMimeType(rawMime: string): string {
  const base = (rawMime || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (base.includes('webm')) return 'audio/webm';
  if (base.includes('ogg')) return 'audio/ogg';
  if (base.includes('wav')) return 'audio/wav';
  if (base.includes('mp4') || base.includes('m4a')) return 'audio/mp4';
  if (base.includes('mp3') || base.includes('mpeg')) return 'audio/mp3';
  return 'audio/webm';
}

/**
 * Transcrit l'enregistrement audio de l'élève avec gemini-3.5-transcribe
 * Schéma officiel generateContent :
 * audioTranscriptionConfig: { languageCodes: ['fr-FR'], wordTimestamp: true }
 */
export async function transcribeAudioWithGemini(
  audioBlob: Blob,
  expectedTokens: string[] = []
): Promise<TranscriptionResult> {
  const client = await getGenAIClient();
  const base64Audio = await blobToBase64(audioBlob);
  const mimeType = sanitizeAudioMimeType(audioBlob.type);

  // 1. Tenter l'appel avec le modèle officiel gemini-3.5-transcribe
  try {
    // Configuration conforme aux spécifications de l'API Google generateContent
    const transcribeConfig = {
      audioTranscriptionConfig: {
        languageCodes: ['fr-FR'],
        wordTimestamp: true,
      },
    };

    const response = await client.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
      ],
      config: transcribeConfig,
    });

    const parsed = extractTranscribedWordsFromResponse(response);
    if (parsed.words.length > 0 || parsed.fullText.trim().length > 0) {
      return parsed;
    }
  } catch (err: unknown) {
    console.warn("Échec ou non-disponibilité directe de gemini-3.5-transcribe, bascule vers mode multimodal fallback :", err);
  }

  // 2. Fallback robuste via gemini-3.8-flash (audio multimodal avec sortie structurée timestamps)
  return fallbackTranscribeWithGeminiFlash(base64Audio, mimeType, expectedTokens);
}

/**
 * Extrait les mots et timestamps du format de réponse de l'API de transcription
 */
function extractTranscribedWordsFromResponse(response: any): TranscriptionResult {
  const words: TranscribedWord[] = [];
  let fullText = '';

  const candidates = response?.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        fullText = fullText ? `${fullText} ${part.text.trim()}` : part.text.trim();
      }

      // Format officiel Google: part.audioTranscription.words
      const audioTranscription = part?.audioTranscription || part?.audio_transcription;
      if (audioTranscription && Array.isArray(audioTranscription.words)) {
        for (const item of audioTranscription.words) {
          const rawWord = item.word || item.text;
          if (rawWord) {
            const startMs = parseOffsetToMs(item.startOffset ?? item.start_offset, 0);
            const endMs = parseOffsetToMs(item.endOffset ?? item.end_offset, startMs + 350);
            words.push({
              text: rawWord,
              cleanText: normalizeWord(rawWord),
              startMs,
              endMs,
              speaker: audioTranscription.speakerLabel || audioTranscription.speaker_label,
            });
          }
        }
      }

      // Format alternatif avec annotations
      const annotations = part?.annotations || candidate?.annotations || [];
      for (const ann of annotations) {
        const wordInfo = ann?.wordInfo || ann?.word_info || ann;
        if (wordInfo?.text || wordInfo?.word) {
          const rawWord = wordInfo.word || wordInfo.text;
          const startMs = parseOffsetToMs(wordInfo.startOffset ?? wordInfo.start_offset, 0);
          const endMs = parseOffsetToMs(wordInfo.endOffset ?? wordInfo.end_offset, startMs + 350);
          words.push({
            text: rawWord,
            cleanText: normalizeWord(rawWord),
            startMs,
            endMs,
            speaker: wordInfo.speaker,
          });
        }
      }
    }
  }

  // Si pas d'annotations de timestamps directes trouvées, découper le texte complet retourné
  if (words.length === 0 && fullText.trim()) {
    const rawList = fullText.trim().split(/\s+/);
    let currentMs = 400;
    for (const item of rawList) {
      const clean = normalizeWord(item);
      if (clean) {
        words.push({
          text: item,
          cleanText: clean,
          startMs: currentMs,
          endMs: currentMs + 400,
        });
        currentMs += 480;
      }
    }
  }

  if (!fullText.trim() && words.length > 0) {
    fullText = words.map((w) => w.text).join(' ');
  }

  const durationMs = words.length > 0 ? words[words.length - 1].endMs : 60000;
  return {
    fullText,
    words,
    durationMs,
  };
}

/**
 * Fallback de transcription audio haute précision via gemini-3.8-flash avec timestamps JSON
 */
async function fallbackTranscribeWithGeminiFlash(
  base64Audio: string,
  mimeType: string,
  customVocabulary: string[]
): Promise<TranscriptionResult> {
  const client = await getGenAIClient();
  const vocabSample = customVocabulary.slice(0, 150);

  const prompt = `Tu es un transcripteur phonétique rigoureux pour l'évaluation de lecture d'enfants (protocole de fluence ELFE).
Transcris mot à mot tout ce qui a été prononcé dans cet enregistrement audio en français.
Conserve toutes les hésitations, répétitions et erreurs de lecture (mode verbatim). Ne corrige pas les fautes de prononciation.
Vocabulaire attendu dans le texte support (repères lexicaux) : ${vocabSample.join(', ')}.

Retourne UNIQUEMENT un JSON strict avec la liste chronologique des mots prononcés et leurs timestamps en secondes :
{
  "fullTranscript": "le texte complet prononcé...",
  "words": [
    { "word": "Au", "startSec": 0.5, "endSec": 0.8 },
    { "word": "sommet", "startSec": 0.9, "endSec": 1.4 }
  ]
}`;

  const response = await client.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      {
        text: prompt,
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const text = response.text || '';
  try {
    const parsed = JSON.parse(text);
    const words: TranscribedWord[] = (parsed.words || []).map((w: any, idx: number) => {
      const startMs = typeof w.startSec === 'number' ? Math.round(w.startSec * 1000) : idx * 500;
      const endMs = typeof w.endSec === 'number' ? Math.round(w.endSec * 1000) : startMs + 400;
      return {
        text: w.word,
        cleanText: normalizeWord(w.word),
        startMs,
        endMs,
      };
    });

    const durationMs = words.length > 0 ? words[words.length - 1].endMs : 60000;
    return {
      fullText: parsed.fullTranscript || words.map((w) => w.text).join(' '),
      words,
      durationMs,
    };
  } catch (parseErr) {
    console.error("Erreur de parsing fallback transcript:", parseErr, text);
    throw new Error("Impossible de décoder la transcription audio.");
  }
}
