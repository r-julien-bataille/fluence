import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Key,
  Shield,
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
}) => {
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    setStoredApiKey(apiKey);
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
      <div className="relative w-full max-w-lg rounded-3xl border border-stone-100 bg-paper p-6 shadow-2xl sm:p-8">
        <button
          className="absolute top-5 right-5 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          onClick={onClose}
          title="Fermer"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold font-fun text-stone-900 text-xl">
              Configuration de la clé API
            </h3>
            <p className="font-sans text-stone-500 text-xs">
              Modèle Bring Your Own Key (BYOK) - 100% Client-Side
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

          <div className="flex items-center gap-3 pt-3">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 font-semibold text-sm text-stone-700 transition-colors hover:bg-cream disabled:opacity-50"
              disabled={isTesting || !apiKey.trim()}
              onClick={handleTest}
              type="button"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              {isTesting ? "Vérification..." : "Tester la clé"}
            </button>
            <button
              className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 font-semibold text-sm text-white shadow-md shadow-primary-200 transition-all hover:bg-primary-700"
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
