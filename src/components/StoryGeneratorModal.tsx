import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

import type { ExerciseText, FluencyLevel } from "@/db/db";
import { db } from "@/db/db";
import { hasStoredApiKey } from "@/lib/gemini/client";
import { generateStoryWithGemini } from "@/lib/gemini/generator";

interface StoryGeneratorModalProps {
  defaultLevel: FluencyLevel;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onStoryCreated: (text: ExerciseText) => void;
  studentName?: string;
}
const EMOJI_PREFIX_REGEX = /^[\p{Emoji}\s]+/u;

const THEME_SUGGESTIONS = [
  "Voyage dans les étoiles",
  "Animaux extraordinaires",
  "Mystère et détectives",
  "Monde sous-marin secret",
  "Forêt enchantée",
  "Championnat sportif",
  "Château magique",
  "Les dinosaures curieux",
];

export const StoryGeneratorModal: React.FC<StoryGeneratorModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
  defaultLevel,
  studentName,
  onOpenSettings,
}) => {
  const [level, setLevel] = useState<FluencyLevel>(defaultLevel);
  const [theme, setTheme] = useState("Mystère & Détectives");
  const [customTheme, setCustomTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewStory, setPreviewStory] = useState<ExerciseText | null>(null);

  if (!isOpen) {
    return null;
  }

  const activeTheme = customTheme.trim() || theme;

  const handleGenerate = async () => {
    if (!hasStoredApiKey()) {
      setErrorMessage(
        "Clé API Google requise. Veuillez renseigner votre clé dans les réglages."
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setPreviewStory(null);

    try {
      const generated = await generateStoryWithGemini({
        level,
        studentName,
        theme: activeTheme,
      });
      setPreviewStory(generated);
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
    setIsGenerating(false);
  };

  const handleSaveAndUse = async () => {
    if (!previewStory) {
      return;
    }
    try {
      await db.texts.add(previewStory);
      onStoryCreated(previewStory);
      onClose();
    } catch {
      setErrorMessage("Erreur lors de la sauvegarde du texte en local.");
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs duration-200">
      <div className="relative my-8 w-full max-w-2xl rounded-3xl border border-stone-100 bg-paper p-6 shadow-2xl sm:p-8">
        <button
          className="absolute top-5 right-5 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          onClick={onClose}
          title="Fermer"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 shadow-inner">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold font-fun text-stone-900 text-xl">
              Créer une histoire sur mesure
            </h3>
            <p className="font-sans text-stone-500 text-xs">
              Généré par Gemini 3.8 Flash selon les normes pédagogiques Éduscol
            </p>
          </div>
        </div>

        {previewStory ? (
          /* Prévisualisation de l'histoire générée */
          <div className="fade-in animate-in space-y-5">
            <div className="rounded-2xl border border-stone-200 bg-cream p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-primary-100 px-2.5 py-0.5 font-bold text-primary-700 text-xs">
                  {previewStory.level} · {previewStory.wordCount} mots
                </span>
                <span className="text-stone-400 text-xs">
                  Cible : {previewStory.targetMclm} MCLM
                </span>
              </div>
              <h4 className="mb-2 font-bold font-fun text-lg text-stone-900">
                {previewStory.title}
              </h4>
              <p className="max-h-48 overflow-y-auto pr-2 text-sm text-stone-700 leading-relaxed">
                {previewStory.content}
              </p>
            </div>

            {previewStory.comprehensionQuestions.length > 0 && (
              <div className="rounded-2xl border border-primary-100/60 bg-primary-50/50 p-4">
                <div className="mb-2 flex items-center gap-1.5 font-bold text-primary-800 text-xs uppercase tracking-wide">
                  <BookOpen className="h-3.5 w-3.5" /> Questions de
                  compréhension
                </div>
                <div className="space-y-2 text-stone-700 text-xs">
                  {previewStory.comprehensionQuestions.map((q, i) => (
                    <div
                      className="rounded-xl border border-primary-50 bg-paper/80 p-2.5"
                      key={i}
                    >
                      <div className="font-semibold text-stone-900">
                        Q{i + 1} : {q.question}
                      </div>
                      <div className="mt-0.5 text-stone-500 italic">
                        Réponse attendue : {q.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 font-semibold text-sm text-stone-700 transition-colors hover:bg-cream"
                onClick={() => setPreviewStory(null)}
                type="button"
              >
                Générer une autre
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-sm text-white shadow-emerald-200 shadow-md transition-all hover:bg-emerald-700"
                onClick={handleSaveAndUse}
                type="button"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>Commencer cette histoire</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Choix du niveau */}
            <div>
              <span className="mb-2 block font-semibold text-sm text-stone-700">
                Niveau scolaire
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(["CE1", "CE2", "CM1", "CM2"] as FluencyLevel[]).map((lvl) => (
                  <button
                    className={`rounded-xl border py-2.5 font-bold text-sm transition-all ${
                      level === lvl
                        ? "border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-200"
                        : "border-stone-200 bg-cream text-stone-700 hover:bg-stone-100"
                    }`}
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    type="button"
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions de thèmes */}
            <div>
              <span className="mb-2 block font-semibold text-sm text-stone-700">
                Idées de thèmes
              </span>
              <div className="flex flex-wrap gap-2">
                {THEME_SUGGESTIONS.map((sug) => {
                  const label = sug.replace(EMOJI_PREFIX_REGEX, "").trim();
                  return (
                    <button
                      className={`rounded-xl border px-3 py-1.5 font-medium text-xs transition-colors ${
                        theme === label && !customTheme
                          ? "border-amber-300 bg-amber-100 font-semibold text-amber-900"
                          : "border-stone-200 bg-cream text-stone-600 hover:bg-stone-100"
                      }`}
                      key={sug}
                      onClick={() => {
                        setTheme(label);
                        setCustomTheme("");
                      }}
                      type="button"
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thème libre */}
            <div>
              <label
                className="mb-1.5 block font-semibold text-sm text-stone-700"
                htmlFor="custom-story-theme-input"
              >
                Ou saisis ton propre thème
              </label>
              <input
                className="w-full rounded-xl border border-stone-200 bg-cream px-4 py-2.5 text-sm text-stone-800 focus:bg-paper focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                id="custom-story-theme-input"
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="Ex : Un dauphin qui explore une épave de pirate..."
                type="text"
                value={customTheme}
              />
            </div>

            {errorMessage && (
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>

                {!hasStoredApiKey() && (
                  <button
                    className="shrink-0 font-bold text-rose-900 underline hover:text-rose-950"
                    onClick={onOpenSettings}
                    type="button"
                  >
                    Régler la clé
                  </button>
                )}
              </div>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 py-3.5 font-bold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-700 disabled:opacity-60"
              disabled={isGenerating}
              onClick={handleGenerate}
              type="button"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Création de l’histoire en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <span>Générer l’histoire ({level})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
