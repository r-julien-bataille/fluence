import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Square,
  Volume2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

import { INITIAL_TEXTS } from "@/db/seeds";
import {
  getAvailableFrenchVoices,
  getStoredVoiceURI,
  setStoredVoiceURI,
  speakFrenchText,
  stopFrenchSpeech,
} from "@/lib/audio/speech";
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

  const [frenchVoices, setFrenchVoices] = useState<SpeechSynthesisVoice[]>(
    getAvailableFrenchVoices
  );
  const [selectedVoiceURI, setSelectedVoiceURI] =
    useState<string>(getStoredVoiceURI);
  const [selectedTestTextId, setSelectedTestTextId] = useState<string>(
    () => INITIAL_TEXTS[0]?.id ?? "cm2-texte-1"
  );
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopFrenchSpeech();
      setIsTestingVoice(false);
      return;
    }

    const updateVoices = () => {
      setFrenchVoices(getAvailableFrenchVoices());
    };

    updateVoices();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopFrenchSpeech();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      stopFrenchSpeech();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          updateVoices
        );
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const selectedTestText =
    INITIAL_TEXTS.find((t) => t.id === selectedTestTextId) ?? INITIAL_TEXTS[0];

  const handleClose = () => {
    stopFrenchSpeech();
    setIsTestingVoice(false);
    onClose();
  };

  const handleSave = () => {
    setStoredApiKey(apiKey.trim());
    setStoredVoiceURI(selectedVoiceURI);
    stopFrenchSpeech();
    setIsTestingVoice(false);
    if (onKeySaved) {
      onKeySaved();
    }
    onClose();
  };

  const handleVoiceChange = (newVoiceURI: string) => {
    setSelectedVoiceURI(newVoiceURI);
    setStoredVoiceURI(newVoiceURI);
    if (isTestingVoice && selectedTestText) {
      speakFrenchText(selectedTestText.content, {
        onEnd: () => setIsTestingVoice(false),
        onError: () => setIsTestingVoice(false),
        rate: 0.85,
        voiceURI: newVoiceURI,
      }).catch(() => setIsTestingVoice(false));
    }
  };

  const handleTestTextChange = (newTextId: string) => {
    setSelectedTestTextId(newTextId);
    const nextText = INITIAL_TEXTS.find((t) => t.id === newTextId);
    if (isTestingVoice && nextText) {
      speakFrenchText(nextText.content, {
        onEnd: () => setIsTestingVoice(false),
        onError: () => setIsTestingVoice(false),
        rate: 0.85,
        voiceURI: selectedVoiceURI,
      }).catch(() => setIsTestingVoice(false));
    }
  };

  const handleToggleVoiceTest = async () => {
    if (isTestingVoice) {
      stopFrenchSpeech();
      setIsTestingVoice(false);
      return;
    }

    if (!selectedTestText) {
      return;
    }

    setIsTestingVoice(true);
    await speakFrenchText(selectedTestText.content, {
      onEnd: () => {
        setIsTestingVoice(false);
      },
      onError: () => {
        setIsTestingVoice(false);
      },
      rate: 0.85,
      voiceURI: selectedVoiceURI,
    });
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
          handleClose();
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
            onClick={handleClose}
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

          <div className="space-y-3 border-t border-stone-100 pt-4">
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-stone-800"
                htmlFor="speech-voice-select"
              >
                Voix de lecture (synthèse vocale)
              </label>
              <select
                className="bg-cream focus:bg-paper focus:ring-primary-500 w-full cursor-pointer rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs text-stone-800 transition-colors focus:ring-2 focus:outline-hidden"
                id="speech-voice-select"
                onChange={(e) => handleVoiceChange(e.target.value)}
                value={selectedVoiceURI}
              >
                <option value="">
                  Automatique (voix française recommandée)
                </option>
                {frenchVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang.replace("_", "-")})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-stone-600">
                Utilisée pour la lecture modèle et la prononciation des mots à
                retravailler.
              </p>
            </div>

            <div className="bg-cream/60 space-y-2.5 rounded-xl border border-stone-200 p-3">
              <label
                className="block text-xs font-semibold text-stone-800"
                htmlFor="voice-test-text-select"
              >
                Tester la voix avec un texte prédéfini
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="bg-paper focus:ring-primary-500 flex-1 cursor-pointer rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-800 transition-colors focus:ring-2 focus:outline-hidden"
                  id="voice-test-text-select"
                  onChange={(e) => handleTestTextChange(e.target.value)}
                  value={selectedTestTextId}
                >
                  {INITIAL_TEXTS.map((text) => (
                    <option key={text.id} value={text.id}>
                      {text.level} — {text.title}
                    </option>
                  ))}
                </select>
                <button
                  className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                    isTestingVoice
                      ? "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100"
                      : "bg-paper hover:bg-cream border-stone-200 text-stone-800"
                  }`}
                  onClick={handleToggleVoiceTest}
                  type="button"
                >
                  {isTestingVoice ? (
                    <>
                      <Square
                        aria-hidden="true"
                        className="h-3 w-3 fill-rose-900"
                      />
                      <span>Arrêter</span>
                    </>
                  ) : (
                    <>
                      <Volume2
                        aria-hidden="true"
                        className="text-primary-600 h-3.5 w-3.5"
                      />
                      <span>Tester la voix</span>
                    </>
                  )}
                </button>
              </div>
              {selectedTestText && (
                <p className="bg-paper max-h-20 overflow-y-auto rounded-lg border border-stone-200/80 p-2.5 text-[11px] leading-relaxed text-stone-700">
                  {selectedTestText.content}
                </p>
              )}
            </div>
          </div>

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
