import { GoogleGenAI } from '@google/genai';

const API_KEY_STORAGE_KEY = 'GOOGLE_AI_KEY';

export function getStoredApiKey(): string {
  const localKey = localStorage.getItem(API_KEY_STORAGE_KEY)?.trim();
  if (localKey) return localKey;
  return (import.meta.env.VITE_GEMINI_API_KEY ?? '').trim();
}

export function setStoredApiKey(key: string): void {
  const cleanKey = key.trim();
  if (cleanKey) {
    localStorage.setItem(API_KEY_STORAGE_KEY, cleanKey);
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export function hasStoredApiKey(): boolean {
  return Boolean(getStoredApiKey());
}

/**
 * Crée ou réutilise une instance du client SDK Google GenAI
 */
export function getGenAIClient(overrideKey?: string): GoogleGenAI {
  const apiKey = overrideKey?.trim() || getStoredApiKey();
  if (!apiKey) {
    throw new Error("Clé API Google AI Studio manquante. Veuillez configurer votre clé dans les paramètres (icône ⚙️).");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Teste la validité de la clé API avec un appel ultra-léger vers gemini-3.8-flash
 */
export function testApiKey(key: string): Promise<{ success: boolean; message: string }> {
  return (async () => {
    try {
      const client = new GoogleGenAI({ apiKey: key.trim() });
      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Réponds uniquement par: OK',
      });
      if (response && response.text) {
        return { success: true, message: 'Clé API validée avec succès !' };
      }
      return { success: false, message: "Réponse inattendue de l'API Google." };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Erreur d'authentification : ${errorMsg}`,
      };
    }
  })();
}
