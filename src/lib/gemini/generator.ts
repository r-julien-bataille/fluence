import { FluencyLevel, ExerciseText } from '@/db/db';
import { getGenAIClient } from './client';
import { tokenizeFrenchText, FLUENCY_NORMS } from '@/lib/utils';

export interface GenerateStoryParams {
  level: FluencyLevel;
  theme: string;
  studentName?: string;
}

interface GeneratedStoryPayload {
  title: string;
  content: string;
  comprehensionQuestions: {
    question: string;
    answer: string;
  }[];
}

const LEVEL_WORD_CONSTRAINTS: Record<FluencyLevel, { min: number; max: number; guidance: string }> = {
  CE1: {
    min: 65,
    max: 85,
    guidance: "Vocabulaire courant et phonologie transparente. Phrases simples et courtes (sujet-verbe-complément). Éviter les structures complexes ou les mots rares."
  },
  CE2: {
    min: 85,
    max: 110,
    guidance: "Vocabulaire usuel avec quelques adjectifs descriptifs. Phrases coordonnées simples. Respecter une progression phonétique fluide."
  },
  CM1: {
    min: 110,
    max: 130,
    guidance: "Récit structuré avec connecteurs logiques (soudain, alors, cependant). Richesse lexicale modérée et variété syntaxique."
  },
  CM2: {
    min: 120,
    max: 150,
    guidance: "Texte narratif ou documentaire complet (120 à 150 mots). Vocabulaire précis et évocateur, dialogues courts possibles, syntaxe fluide mais stimulante."
  }
};

export async function generateStoryWithGemini(params: GenerateStoryParams): Promise<ExerciseText> {
  const client = await getGenAIClient();
  const constraints = LEVEL_WORD_CONSTRAINTS[params.level];
  const targetMclm = FLUENCY_NORMS[params.level].target;

  const systemInstruction = `Tu es un expert pédagogique français spécialisé dans l'apprentissage de la lecture à l'école primaire (protocole ELFE, Cogni-Sciences, Éduscol).
Ta mission est de rédiger un texte court destiné à l'entraînement et l'évaluation de la fluence de lecture pour un élève de ${params.level}.`;

  const prompt = `Génère une histoire captivante pour un enfant de ${params.level} sur le thème "${params.theme}".${params.studentName ? ` Le héros ou l'héroïne peut s'appeler ${params.studentName}.` : ''}

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
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("L'IA n'a retourné aucun contenu.");
  }

  let payload: GeneratedStoryPayload;
  try {
    payload = JSON.parse(responseText.trim());
  } catch (err) {
    // Tentative d'extraction si entouré de backticks markdown
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      payload = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Format de réponse invalide : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const tokenList = tokenizeFrenchText(payload.content);
  const cleanTokens = tokenList.map((t) => t.clean);

  const exerciseText: ExerciseText = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: payload.title || `Histoire : ${params.theme}`,
    level: params.level,
    theme: params.theme,
    content: payload.content,
    tokens: cleanTokens,
    targetMclm,
    wordCount: cleanTokens.length,
    comprehensionQuestions: payload.comprehensionQuestions || [],
    isCustom: true,
    createdAt: Date.now(),
  };

  return exerciseText;
}
