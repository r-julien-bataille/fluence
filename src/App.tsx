import { Key, WifiOff, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { Header } from "./components/Header";
import { SessionRunner } from "./components/SessionRunner";
import { SourcesFooter } from "./components/SourcesFooter";
import type { StudentProfile } from "./components/StudentSelector";
import { seedDatabaseIfEmpty } from "./db/seeds";
import { hasStoredApiKey } from "./lib/gemini/client";
import { applyTheme, getStoredTheme, type ThemeId } from "./lib/theme";

const SettingsModal = lazy(async () => {
  const m = await import("./components/SettingsModal");
  return { default: m.SettingsModal };
});
const HistoryDrawer = lazy(async () => {
  const m = await import("./components/HistoryDrawer");
  return { default: m.HistoryDrawer };
});

const DEFAULT_STUDENTS: StudentProfile[] = [
  { level: "CM2", name: "Hugo" },
  { level: "CE2", name: "Léa" },
  { level: "CM1", name: "Thomas" },
  { level: "CE1", name: "Manon" },
];

export const App: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>(() => {
    const saved = localStorage.getItem("FLUENCE_STUDENTS");
    return saved ? JSON.parse(saved) : DEFAULT_STUDENTS;
  });

  const [currentStudent, setCurrentStudent] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem("FLUENCE_CURRENT_STUDENT");
    return saved ? JSON.parse(saved) : DEFAULT_STUDENTS[0];
  });

  const [dyslexicMode, setDyslexicMode] = useState<boolean>(
    () => localStorage.getItem("FLUENCE_DYS_MODE") === "true"
  );

  const [theme, setTheme] = useState<ThemeId>(getStoredTheme);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasKey, setHasKey] = useState(hasStoredApiKey());
  const [dismissBanner, setDismissBanner] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  // Initialisation de la base Dexie avec les seeds ELFE
  useEffect(() => {
    seedDatabaseIfEmpty();
  }, []);

  // Synchronisation de l'état réseau (mode hors-ligne PWA)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Synchronisation du thème scolaire
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sauvegarde des profils
  useEffect(() => {
    localStorage.setItem("FLUENCE_STUDENTS", JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(
      "FLUENCE_CURRENT_STUDENT",
      JSON.stringify(currentStudent)
    );
  }, [currentStudent]);

  useEffect(() => {
    localStorage.setItem("FLUENCE_DYS_MODE", String(dyslexicMode));
    document.body.classList.toggle("dys-mode", dyslexicMode);
  }, [dyslexicMode]);

  const handleAddStudent = (newStudent: StudentProfile) => {
    setStudents((prev) => [...prev, newStudent]);
  };

  const handleKeySaved = () => {
    setHasKey(hasStoredApiKey());
  };

  const isOverlayOpen = isSettingsOpen || isHistoryOpen;

  return (
    <div className="flex min-h-screen flex-col bg-cream font-sans">
      <div
        className="flex flex-1 flex-col"
        inert={isOverlayOpen ? true : undefined}
      >
        {/* Header global */}
        <Header
          currentStudent={currentStudent}
          dyslexicMode={dyslexicMode}
          onAddStudent={handleAddStudent}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSelectStudent={setCurrentStudent}
          onToggleDyslexicMode={() => setDyslexicMode(!dyslexicMode)}
          students={students}
        />

        {/* Alerte si passage hors ligne */}
        {!isOnline && (
          <div
            aria-live="polite"
            className="flex items-center justify-center gap-2 border-amber-300 border-b bg-amber-100 px-4 py-1.5 font-medium text-amber-900 text-xs"
            role="status"
          >
            <WifiOff
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-amber-700"
            />
            <span>
              Mode hors-ligne : Les textes, le chronomètre et l'historique
              restent 100% disponibles.
            </span>
          </div>
        )}

        {/* Alerte discrète si pas de clé configurée */}
        {!(hasKey || dismissBanner) && (
          <div className="flex items-center justify-between bg-amber-500 px-4 py-2.5 font-semibold text-stone-950 text-xs shadow-xs sm:text-sm">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Key
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-stone-950"
                />
                <span>
                  <strong>Modèle BYOK :</strong> Ajoutez votre clé Google AI
                  Studio pour activer la transcription vocale Gemini et le
                  générateur d’histoires.
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="cursor-pointer rounded-xl bg-stone-950 px-3 py-1 font-bold text-white text-xs transition-colors hover:bg-stone-800"
                  onClick={() => setIsSettingsOpen(true)}
                  type="button"
                >
                  Renseigner ma clé
                </button>
                <button
                  aria-label="Fermer le bandeau d'information"
                  className="cursor-pointer p-1.5 text-stone-900 hover:text-black"
                  onClick={() => setDismissBanner(true)}
                  title="Fermer ce message"
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenu principal / Machine à états */}
        <main className="flex-1 pb-16">
          <SessionRunner
            currentStudent={currentStudent}
            dyslexicMode={dyslexicMode}
            key={`${currentStudent.name}-${currentStudent.level}`}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </main>

        <SourcesFooter />
      </div>

      {/* Modal Réglages Clé API & Ambiances */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            currentTheme={theme}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onKeySaved={handleKeySaved}
            onSelectTheme={setTheme}
          />
        </Suspense>
      )}

      {/* Tiroir Historique des séances */}
      {isHistoryOpen && (
        <Suspense fallback={null}>
          <HistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            selectedStudent={currentStudent.name}
          />
        </Suspense>
      )}
    </div>
  );
};
