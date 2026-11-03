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
      className="fade-in animate-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/50 p-4 backdrop-blur-xs duration-150"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="story-generator-modal-title"
        aria-modal="true"
        className="bg-paper relative my-8 w-full max-w-xl rounded-2xl border border-stone-200 p-6 shadow-xl"
        role="dialog"
      >
        <div className="mb-5 flex items-center justify-between border-b border-stone-100 pb-3">
          <h2
            className="font-fun text-lg font-bold text-stone-900"
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
            <div className="bg-cream rounded-xl border border-stone-200 p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-stone-600">
                <span className="text-primary-800 font-bold">
                  {previewStory.level} · {previewStory.wordCount} mots
                </span>
                <span>Cible : {previewStory.targetMclm} MCLM</span>
              </div>
              <h3 className="font-fun mb-2 text-lg font-bold text-stone-900">
                {previewStory.title}
              </h3>
              <p className="max-h-48 overflow-y-auto pr-2 text-xs leading-relaxed text-stone-700 sm:text-sm">
                {previewStory.content}
              </p>
            </div>

            {previewStory.comprehensionQuestions.length > 0 && (
              <div className="bg-paper space-y-1.5 rounded-xl border border-stone-200 p-3.5 text-xs">
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
                className="hover:bg-cream flex-1 cursor-pointer rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 transition-colors"
                onClick={() => setPreviewStory(null)}
                type="button"
              >
                Autre proposition
              </button>
              <button
                className="bg-primary-600 hover:bg-primary-700 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors"
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
              <span className="mb-1.5 block text-xs font-semibold text-stone-800">
                Niveau
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(["CE1", "CE2", "CM1", "CM2"] as FluencyLevel[]).map((lvl) => (
                  <button
                    className={`cursor-pointer rounded-lg border py-2 text-xs font-bold transition-colors ${
                      level === lvl
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "bg-cream/60 hover:bg-cream border-stone-200 text-stone-700"
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
              <span className="mb-1.5 block text-xs font-semibold text-stone-800">
                Thème suggéré
              </span>
              <div className="flex flex-wrap gap-1.5">
                {THEME_SUGGESTIONS.map((sug) => (
                  <button
                    className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      theme === sug && !customTheme
                        ? "border-primary-500 bg-primary-50 text-primary-900 font-semibold"
                        : "bg-cream/60 hover:bg-cream border-stone-200 text-stone-700"
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
                className="mb-1.5 block text-xs font-semibold text-stone-800"
                htmlFor="custom-story-theme-input"
              >
                Ou sujet libre
              </label>
              <input
                className="bg-cream focus:bg-paper focus:ring-primary-500 w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs text-stone-800 focus:ring-2 focus:outline-hidden"
                id="custom-story-theme-input"
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="Ex : Un dauphin qui explore une épave de pirate..."
                type="text"
                value={customTheme}
              />
            </div>

            {errorMessage && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
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
              className="bg-primary-600 hover:bg-primary-700 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white transition-colors disabled:opacity-60 sm:text-sm"
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
