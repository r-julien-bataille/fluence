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
      "Texte narratif ou documentaire complet (120 à 150 mots). Vocabulaire précis et évocateur, dialogues courts possibles, syntaxe fluide mais stimulante.",
    max: 150,
    min: 120,
  },
};

export const generateStoryWithGemini = async (
  params: GenerateStoryParams
): Promise<ExerciseText> => {
  const client = await getGenAIClient();
  const constraints = LEVEL_WORD_CONSTRAINTS[params.level];
  const targetMclm = FLUENCY_NORMS[params.level].target;

  const systemInstruction = `Tu es un expert pédagogique français spécialisé dans l'apprentissage de la lecture à l'école primaire (protocole ELFE, Cogni-Sciences, Éduscol).
Ta mission est de rédiger un texte court destiné à l'entraînement et l'évaluation de la fluence de lecture pour un élève de ${params.level}.`;

  const prompt = `Génère une histoire captivante pour un enfant de ${params.level} sur le thème "${params.theme}".${params.studentName ? ` Le héros ou l'héroïne peut s'appeler ${params.studentName}.` : ""}

Contraintes pédagogiques strictes :
1. Longueur : impérativement entre ${constraints.min} et ${constraints.max} mots (décompte strict).
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

  let payload: GeneratedStoryPayload;
  try {
    payload = JSON.parse(responseText.trim());
  } catch (error) {
    // Tentative d'extraction si entouré de backticks markdown
    const jsonMatch = responseText.match(JSON_BLOCK_REGEX);
    if (jsonMatch) {
      const [matchedJson = ""] = jsonMatch;
      payload = JSON.parse(matchedJson);
    } else {
      throw new Error(
        `Format de réponse invalide : ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }

  const tokenList = tokenizeFrenchText(payload.content);
  const cleanTokens = tokenList.map((t) => t.clean);

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
