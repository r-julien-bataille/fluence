import React, { useState } from 'react';
import { FluencyLevel, ExerciseText } from '@/db/db';
import { generateStoryWithGemini } from '@/lib/gemini/generator';
import { db } from '@/db/db';
import { hasStoredApiKey } from '@/lib/gemini/client';
import { Sparkles, X, Wand2, BookOpen, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface StoryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: (text: ExerciseText) => void;
  defaultLevel: FluencyLevel;
  studentName?: string;
  onOpenSettings: () => void;
}

const THEME_SUGGESTIONS = [
  '🚀 Voyage dans les étoiles',
  '🐾 Animaux extraordinaires',
  '🕵️‍♀️ Mystère et détectives',
  '🌊 Monde sous-marin secret',
  '🌲 Forêt enchantée',
  '⚽ Championnat sportif',
  '🏰 Château magique',
  '🦖 Les dinosaures curieux',
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
  const [theme, setTheme] = useState('Mystère & Détectives');
  const [customTheme, setCustomTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewStory, setPreviewStory] = useState<ExerciseText | null>(null);

  if (!isOpen) return null;

  const activeTheme = customTheme.trim() || theme;

  const handleGenerate = async () => {
    if (!hasStoredApiKey()) {
      setError("Clé API Google requise. Veuillez renseigner votre clé dans les réglages.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPreviewStory(null);

    try {
      const generated = await generateStoryWithGemini({
        level,
        theme: activeTheme,
        studentName,
      });
      setPreviewStory(generated);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndUse = async () => {
    if (!previewStory) return;
    try {
      await db.texts.add(previewStory);
      onStoryCreated(previewStory);
      onClose();
    } catch (err) {
      setError("Erreur lors de la sauvegarde du texte en local.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-inner">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-fun">
              Créer une histoire sur mesure
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Généré par Gemini 3.8 Flash selon les normes pédagogiques Éduscol
            </p>
          </div>
        </div>

        {!previewStory ? (
          <div className="space-y-5">
            {/* Choix du niveau */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Niveau scolaire
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['CE1', 'CE2', 'CM1', 'CM2'] as FluencyLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`py-2.5 rounded-xl font-bold text-sm transition-all border ${
                      level === lvl
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions de thèmes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Idées de thèmes
              </label>
              <div className="flex flex-wrap gap-2">
                {THEME_SUGGESTIONS.map((sug) => {
                  const label = sug.replace(/^[\p{Emoji}\s]+/u, '').trim();
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setTheme(label);
                        setCustomTheme('');
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors border ${
                        theme === label && !customTheme
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thème libre */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Ou saisis ton propre thème
              </label>
              <input
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="Ex : Un dauphin qui explore une épave de pirate..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {!hasStoredApiKey() && (
                  <button
                    onClick={onOpenSettings}
                    className="underline font-bold text-rose-900 hover:text-rose-950 shrink-0"
                  >
                    Régler la clé
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Création de l'histoire en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>Générer l'histoire ({level})</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Prévisualisation de l'histoire générée */
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                  {previewStory.level} · {previewStory.wordCount} mots
                </span>
                <span className="text-xs text-slate-400">
                  Cible : {previewStory.targetMclm} MCLM
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 font-fun mb-2">
                {previewStory.title}
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto pr-2">
                {previewStory.content}
              </p>
            </div>

            {previewStory.comprehensionQuestions.length > 0 && (
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/60">
                <div className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Questions de compréhension
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  {previewStory.comprehensionQuestions.map((q, i) => (
                    <div key={i} className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                      <div className="font-semibold text-slate-900">Q{i + 1} : {q.question}</div>
                      <div className="text-slate-500 mt-0.5 italic">Réponse attendue : {q.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewStory(null)}
                className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Générer une autre
              </button>
              <button
                onClick={handleSaveAndUse}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Commencer cette histoire</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
