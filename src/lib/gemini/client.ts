import type { GoogleGenAI } from "@google/genai";

const API_KEY_STORAGE_KEY = "GOOGLE_AI_KEY";

export const getStoredApiKey = (): string => {
  const localKey = localStorage.getItem(API_KEY_STORAGE_KEY)?.trim();
  if (localKey) {
    return localKey;
  }
  return (import.meta.env.VITE_GEMINI_API_KEY ?? "").trim();
};

export const setStoredApiKey = (key: string): void => {
  const cleanKey = key.trim();
  if (cleanKey) {
    localStorage.setItem(API_KEY_STORAGE_KEY, cleanKey);
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
};

export const hasStoredApiKey = (): boolean => Boolean(getStoredApiKey());

/**
 * Crée une instance du client SDK Google GenAI (chargé dynamiquement à la demande)
 */
export const getGenAIClient = async (
  overrideKey?: string
): Promise<GoogleGenAI> => {
  const apiKey = overrideKey?.trim() || getStoredApiKey();
  if (!apiKey) {
    throw new Error(
      "Clé API Google AI Studio manquante. Veuillez configurer votre clé dans les paramètres (icône ⚙️)."
    );
  }
  const { GoogleGenAI: GenAIConstructor } = await import("@google/genai");
  return new GenAIConstructor({ apiKey });
};

/**
 * Teste la validité de la clé API avec un appel ultra-léger vers gemini-3.8-flash
 */
export const testApiKey = async (
  key: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const client = await getGenAIClient(key.trim());
    const response = await client.models.generateContent({
      contents: "Réponds uniquement par: OK",
      model: "gemini-3.8-flash",
    });
    if (response?.text) {
      return { message: "Clé API validée avec succès !", success: true };
    }
    return { message: "Réponse inattendue de l'API Google.", success: false };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      message: `Erreur d'authentification : ${errorMsg}`,
      success: false,
    };
  }
};
