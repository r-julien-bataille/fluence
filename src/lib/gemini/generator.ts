import type { ExerciseText, FluencyLevel } from "@/db/db";
import { FLUENCY_NORMS, tokenizeFrenchText } from "@/lib/utils";

import { getGenAIClient } from "./client";

const JSON_BLOCK_REGEX = /\{[\s\S]*\}/u;

export interface GenerateStoryParams {
  level: FluencyLevel;
  studentName?: string;
  theme: string;
}

interface GeneratedStoryPayload {
  comprehensionQuestions: {
    question: string;
    answer: string;
  }[];
  content: string;
  title: string;
}

const LEVEL_WORD_CONSTRAINTS: Record<
  FluencyLevel,
  { min: number; max: number; guidance: string }
> = {
  CE1: {
    guidance:
      "Vocabulaire courant et phonologie transparente. Phrases simples et courtes (sujet-verbe-complément). Éviter les structures complexes ou les mots rares.",
    max: 85,
    min: 65,
  },
  CE2: {
    guidance:
      "Vocabulaire usuel avec quelques adjectifs descriptifs. Phrases coordonnées simples. Respecter une progression phonétique fluide.",
    max: 110,
    min: 85,
  },
  CM1: {
    guidance:
      "Récit structuré avec connecteurs logiques (soudain, alors, cependant). Richesse lexicale modérée et variété syntaxique.",
    max: 130,
    min: 110,
  },
  CM2: {
    guidance:
      "Texte narratif ou documentaire complet (100 à 120 mots au maximum, ne jamais dépasser 120 mots). Vocabulaire précis et évocateur, dialogues courts possibles, syntaxe fluide mais stimulante.",
    max: 120,
    min: 100,
  },
};

const parseStoryPayload = (responseText: string): GeneratedStoryPayload => {
  try {
    return JSON.parse(responseText.trim());
  } catch (error) {
    // Tentative d'extraction si entouré de backticks markdown
    const jsonMatch = responseText.match(JSON_BLOCK_REGEX);
    if (jsonMatch) {
      const [matchedJson = ""] = jsonMatch;
      return JSON.parse(matchedJson);
    }
    throw new Error(
      `Format de réponse invalide : ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
};

export const generateStoryWithGemini = async (
  params: GenerateStoryParams
): Promise<ExerciseText> => {
  const client = await getGenAIClient();
  const constraints = LEVEL_WORD_CONSTRAINTS[params.level];
  const targetMclm = FLUENCY_NORMS[params.level].target;
  const targetWords = Math.round((constraints.min + constraints.max) / 2);

  const systemInstruction = `Tu es un expert pédagogique français spécialisé dans l'apprentissage de la lecture à l'école primaire (protocole ELFE, Cogni-Sciences, Éduscol).
Ta mission est de rédiger un texte court destiné à l'entraînement et l'évaluation de la fluence de lecture pour un élève de ${params.level}.`;

  const prompt = `Génère une histoire captivante pour un enfant de ${params.level} sur le thème "${params.theme}".${params.studentName ? ` Le héros ou l'héroïne peut s'appeler ${params.studentName}.` : ""}

Contraintes pédagogiques strictes :
1. Longueur : impérativement entre ${constraints.min} et ${constraints.max} mots au maximum (LIMITE STRICTE : ne JAMAIS dépasser ${constraints.max} mots au total, vise environ ${targetWords} mots).
Rappel essentiel de décompte : en français (norme ELFE/Éduscol), chaque mot élidé avec apostrophe compte pour un mot distinct (ex: "l'arbre" = 2 mots, "d'un" = 2 mots, "qu'il" = 2 mots, "c'est" = 2 mots). Compte rigoureusement chaque token et assure-toi que le total absolu reste strictement inférieur ou égal à ${constraints.max} mots.
2. Adaptabilité lexicale et syntaxique pour ${params.level} : ${constraints.guidance}
3. Ponctuation soignée, adaptée à une lecture orale expressive.
4. Pas de vulgarité, pas de violence.
5. Inclus 2 questions simples de compréhension avec leurs réponses concises.

Retourne UNIQUEMENT un objet JSON conforme au schéma suivant :
{
  "title": "Titre du texte",
  "content": "Le texte complet sans découpage artificiel...",
  "comprehensionQuestions": [
    { "question": "Question 1 ?", "answer": "Réponse 1" },
    { "question": "Question 2 ?", "answer": "Réponse 2" }
  ]
}`;

  const response = await client.models.generateContent({
    config: {
      responseMimeType: "application/json",
      systemInstruction,
      temperature: 0.7,
    },
    contents: prompt,
    model: "gemini-3.8-flash",
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("L'IA n'a retourné aucun contenu.");
  }

  let payload = parseStoryPayload(responseText);
  let tokenList = tokenizeFrenchText(payload.content);
  let cleanTokens = tokenList.map((t) => t.clean);

  // Si le modèle a dépassé la limite haute autorisée, on sollicite un ajustement immédiat
  if (cleanTokens.length > constraints.max) {
    const shortenPrompt = `Le texte ci-dessous comporte ${cleanTokens.length} mots, ce qui dépasse la limite maximale absolue de ${constraints.max} mots pour le niveau ${params.level} (rappel : les formes élidées comme "l'", "d'", "s'", "c'" comptent chacune comme un mot).

Raccourcis impérativement ce texte pour qu'il contienne entre ${constraints.min} et ${constraints.max} mots au total (idéalement environ ${targetWords} mots), en préservant un récit complet avec un dénouement clair. Ajuste les questions si nécessaire.

Texte à raccourcir :
${payload.content}

Retourne UNIQUEMENT un objet JSON conforme au même format (title, content, comprehensionQuestions).`;

    try {
      const retryResponse = await client.models.generateContent({
        config: {
          responseMimeType: "application/json",
          systemInstruction,
          temperature: 0.3,
        },
        contents: shortenPrompt,
        model: "gemini-3.8-flash",
      });

      if (retryResponse.text) {
        const retryPayload = parseStoryPayload(retryResponse.text);
        const retryTokens = tokenizeFrenchText(retryPayload.content);
        if (
          retryTokens.length <= constraints.max &&
          retryTokens.length >= Math.floor(constraints.min * 0.85)
        ) {
          payload = retryPayload;
          tokenList = retryTokens;
          cleanTokens = retryTokens.map((t) => t.clean);
        }
      }
    } catch {
      // Poursuite avec le contenu initial si la correction échoue
    }
  }

  const exerciseText: ExerciseText = {
    comprehensionQuestions: payload.comprehensionQuestions || [],
    content: payload.content,
    createdAt: Date.now(),
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    isCustom: true,
    level: params.level,
    targetMclm,
    theme: params.theme,
    title: payload.title || `Histoire : ${params.theme}`,
    tokens: cleanTokens,
    wordCount: cleanTokens.length,
  };

  return exerciseText;
};
