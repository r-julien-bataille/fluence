import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

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

const THEME_SUGGESTIONS = [
  "Voyage dans les étoiles",
  "Animaux extraordinaires",
  "Mystère et détectives",
  "Monde sous-marin",
  "Forêt enchantée",
  "Championnat sportif",
  "Château médiéval",
  "Les dinosaures",
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
  const [theme, setTheme] = useState("Mystère et détectives");
  const [customTheme, setCustomTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewStory, setPreviewStory] = useState<ExerciseText | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const activeTheme = customTheme.trim() || theme;

  const handleGenerate = async () => {
    if (!hasStoredApiKey()) {
      setErrorMessage(
        "Clé API Google requise. Ajoutez votre clé dans les réglages."
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
    <div
      className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center overflow-y-auto bg-stone-900/50 p-4 backdrop-blur-xs duration-150"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="story-generator-modal-title"
        aria-modal="true"
        className="relative my-8 w-full max-w-xl rounded-2xl border border-stone-200 bg-paper p-6 shadow-xl"
        role="dialog"
      >
        <div className="mb-5 flex items-center justify-between border-stone-100 border-b pb-3">
          <h2
            className="font-bold font-fun text-lg text-stone-900"
            id="story-generator-modal-title"
          >
            Nouvelle histoire sur mesure
          </h2>
          <button
            aria-label="Fermer la fenêtre"
            className="cursor-pointer rounded-lg p-1.5 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {previewStory ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-200 bg-cream p-4">
              <div className="mb-1.5 flex items-center justify-between text-stone-600 text-xs">
                <span className="font-bold text-primary-800">
                  {previewStory.level} · {previewStory.wordCount} mots
                </span>
                <span>Cible : {previewStory.targetMclm} MCLM</span>
              </div>
              <h3 className="mb-2 font-bold font-fun text-lg text-stone-900">
                {previewStory.title}
              </h3>
              <p className="max-h-48 overflow-y-auto pr-2 text-stone-700 text-xs leading-relaxed sm:text-sm">
                {previewStory.content}
              </p>
            </div>

            {previewStory.comprehensionQuestions.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-stone-200 bg-paper p-3.5 text-xs">
                <div className="font-semibold text-stone-700">
                  Questions de compréhension (
                  {previewStory.comprehensionQuestions.length})
                </div>
                {previewStory.comprehensionQuestions.map((q, i) => (
                  <div className="text-stone-600" key={i}>
                    {i + 1}. {q.question}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <button
                className="flex-1 cursor-pointer rounded-xl border border-stone-200 px-4 py-2.5 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream"
                onClick={() => setPreviewStory(null)}
                type="button"
              >
                Autre proposition
              </button>
              <button
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 font-bold text-white text-xs transition-colors hover:bg-primary-700"
                onClick={handleSaveAndUse}
                type="button"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Lire cette histoire</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block font-semibold text-stone-800 text-xs">
                Niveau
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(["CE1", "CE2", "CM1", "CM2"] as FluencyLevel[]).map((lvl) => (
                  <button
                    className={`cursor-pointer rounded-lg border py-2 font-bold text-xs transition-colors ${
                      level === lvl
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-stone-200 bg-cream/60 text-stone-700 hover:bg-cream"
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

            <div>
              <span className="mb-1.5 block font-semibold text-stone-800 text-xs">
                Thème suggéré
              </span>
              <div className="flex flex-wrap gap-1.5">
                {THEME_SUGGESTIONS.map((sug) => (
                  <button
                    className={`cursor-pointer rounded-lg border px-2.5 py-1.5 font-medium text-xs transition-colors ${
                      theme === sug && !customTheme
                        ? "border-primary-500 bg-primary-50 font-semibold text-primary-900"
                        : "border-stone-200 bg-cream/60 text-stone-700 hover:bg-cream"
                    }`}
                    key={sug}
                    onClick={() => {
                      setTheme(sug);
                      setCustomTheme("");
                    }}
                    type="button"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className="mb-1.5 block font-semibold text-stone-800 text-xs"
                htmlFor="custom-story-theme-input"
              >
                Ou sujet libre
              </label>
              <input
                className="w-full rounded-xl border border-stone-200 bg-cream px-3.5 py-2 text-stone-800 text-xs focus:bg-paper focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                id="custom-story-theme-input"
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="Ex : Un dauphin qui explore une épave de pirate..."
                type="text"
                value={customTheme}
              />
            </div>

            {errorMessage && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>

                {!hasStoredApiKey() && (
                  <button
                    className="shrink-0 cursor-pointer font-bold text-rose-900 underline"
                    onClick={onOpenSettings}
                    type="button"
                  >
                    Configurer la clé
                  </button>
                )}
              </div>
            )}

            <button
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 font-bold text-white text-xs transition-colors hover:bg-primary-700 disabled:opacity-60 sm:text-sm"
              disabled={isGenerating}
              onClick={handleGenerate}
              type="button"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Rédaction en cours...</span>
                </>
              ) : (
                <span>Créer l’histoire ({level})</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
