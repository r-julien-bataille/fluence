import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Shield,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

import {
  getStoredApiKey,
  setStoredApiKey,
  testApiKey,
} from "@/lib/gemini/client";
import type { ThemeId } from "@/lib/theme";
import { ThemeSelector } from "./ThemeSelector";

interface SettingsModalProps {
  currentTheme?: ThemeId;
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
  onSelectTheme?: (themeId: ThemeId) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
  currentTheme,
  onSelectTheme,
}) => {
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    setStoredApiKey(apiKey.trim());
    if (onKeySaved) {
      onKeySaved();
    }
    onClose();
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        message: "Veuillez saisir une clé API valide.",
        success: false,
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await testApiKey(apiKey.trim());
    setIsTesting(false);
    setTestResult(res);
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs duration-200">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-stone-100 bg-paper p-6 shadow-2xl sm:p-8">
        <button
          aria-label="Fermer les réglages"
          className="absolute top-5 right-5 cursor-pointer rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
          onClick={onClose}
          title="Fermer"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 shadow-inner">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold font-fun text-stone-900 text-xl">
              Réglages de l'application
            </h3>
            <p className="font-sans text-stone-500 text-xs">
              Clé API Gemini (BYOK) & Ambiance visuelle scolaire
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4 text-primary-800 text-xs">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
            <div>
              <p className="mb-1 font-semibold">Confidentialité garantie</p>
              <p>
                Votre clé Google AI Studio est stockée exclusivement dans le{" "}
                <code className="rounded bg-primary-100 px-1 py-0.5 font-mono">
                  localStorage
                </code>{" "}
                de votre navigateur. Aucune donnée n’est envoyée à un serveur
                tiers.
              </p>
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block font-semibold text-sm text-stone-700"
              htmlFor="gemini-api-key-input"
            >
              Clé Google AI Studio (Gemini)
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-stone-200 bg-cream px-4 py-3 font-mono text-sm text-stone-800 transition-all focus:bg-paper focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                id="gemini-api-key-input"
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                type="password"
                value={apiKey}
              />
            </div>
            <p className="mt-1.5 flex items-center justify-between text-stone-500 text-xs">
              <span>
                Utilise <code>gemini-3.5-transcribe</code> et{" "}
                <code>gemini-3.8-flash</code>
              </span>
              <a
                className="inline-flex items-center gap-1 font-medium text-primary-600 underline hover:text-primary-800"
                href="https://aistudio.google.com/app/apikey"
                rel="noreferrer"
                target="_blank"
              >
                Obtenir une clé gratuite <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2.5 rounded-xl p-3.5 text-sm ${
                testResult.success
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              )}
              <span className="text-xs leading-relaxed">
                {testResult.message}
              </span>
            </div>
          )}

          {/* Section Ambiances scolaires */}
          {currentTheme && onSelectTheme && (
            <div className="border-stone-100 border-t pt-4">
              <div className="mb-3">
                <h4 className="font-bold font-fun text-sm text-stone-900">
                  Ambiance visuelle scolaire
                </h4>
                <p className="font-sans text-stone-500 text-xs">
                  4 palettes lumineuses et stimulantes pensées pour la classe,
                  conformes aux normes WCAG AA.
                </p>
              </div>
              <ThemeSelector
                currentTheme={currentTheme}
                onSelectTheme={onSelectTheme}
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-3">
            <button
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 font-semibold text-sm text-stone-700 transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isTesting || !apiKey.trim()}
              onClick={handleTest}
              type="button"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              {isTesting ? "Vérification..." : "Tester la clé"}
            </button>
            <button
              className="flex-1 cursor-pointer rounded-xl bg-primary-600 px-4 py-2.5 font-semibold text-sm text-white shadow-md shadow-primary-200 transition-all hover:bg-primary-700"
              onClick={handleSave}
              type="button"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
