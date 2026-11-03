import { AlertCircle, CheckCircle2, ExternalLink, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

import {
  getStoredApiKey,
  setStoredApiKey,
  testApiKey,
} from "@/lib/gemini/client";
import type { ThemeId } from "@/lib/theme";
import { APP_VERSION } from "@/lib/version";
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
    <div
      className="fade-in animate-in fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-xs duration-150"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="settings-modal-title"
        aria-modal="true"
        className="bg-paper relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 p-6 shadow-xl"
        role="dialog"
      >
        <div className="mb-5 flex items-center justify-between border-b border-stone-100 pb-3">
          <h2
            className="font-fun text-lg font-bold text-stone-900"
            id="settings-modal-title"
          >
            Réglages
          </h2>
          <button
            aria-label="Fermer les réglages"
            className="cursor-pointer rounded-lg p-1.5 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                className="text-xs font-semibold text-stone-800"
                htmlFor="gemini-api-key-input"
              >
                Clé API Google Gemini
              </label>
              <a
                className="text-primary-700 hover:text-primary-900 inline-flex items-center gap-1 text-xs font-medium underline"
                href="https://aistudio.google.com/app/apikey"
                rel="noopener noreferrer"
                target="_blank"
              >
                Obtenir une clé{" "}
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            </div>
            <input
              className="bg-cream focus:bg-paper focus:ring-primary-500 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 font-mono text-xs text-stone-800 transition-colors focus:ring-2 focus:outline-hidden"
              id="gemini-api-key-input"
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="AIzaSy..."
              type="password"
              value={apiKey}
            />
            <p className="mt-1.5 text-[11px] text-stone-600">
              Stockée uniquement dans votre navigateur pour la transcription
              audio et la création de textes.
            </p>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                testResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
              role="status"
            >
              {testResult.success ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                />
              ) : (
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {currentTheme && onSelectTheme && (
            <div className="border-t border-stone-100 pt-4">
              <div className="mb-2.5 text-xs font-semibold text-stone-800">
                Couleur d’accentuation
              </div>
              <ThemeSelector
                currentTheme={currentTheme}
                onSelectTheme={onSelectTheme}
              />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-stone-100 pt-4">
            <span className="font-mono text-[11px] text-stone-600">
              v{APP_VERSION}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="hover:bg-cream cursor-pointer rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-700 transition-colors disabled:opacity-50"
                disabled={isTesting || !apiKey.trim()}
                onClick={handleTest}
                type="button"
              >
                {isTesting ? "Vérification..." : "Tester la clé"}
              </button>
              <button
                className="bg-primary-600 hover:bg-primary-700 cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors"
                onClick={handleSave}
                type="button"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
