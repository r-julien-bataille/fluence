import { WifiOff } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { Header } from "./components/Header";
import { SessionRunner } from "./components/SessionRunner";
import { SourcesFooter } from "./components/SourcesFooter";
import type { StudentProfile } from "./components/StudentSelector";
import { seedDatabaseIfEmpty } from "./db/seeds";
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
    setStudents((prev) => {
      const exists = prev.some(
        (s) =>
          s.name.trim().toLocaleLowerCase("fr-FR") ===
          newStudent.name.trim().toLocaleLowerCase("fr-FR")
      );
      return exists ? prev : [...prev, newStudent];
    });
  };

  const handleDeleteStudent = (studentToDelete: StudentProfile) => {
    setStudents((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      const next = prev.filter(
        (s) =>
          s.name.trim().toLocaleLowerCase("fr-FR") !==
          studentToDelete.name.trim().toLocaleLowerCase("fr-FR")
      );
      if (
        currentStudent.name.trim().toLocaleLowerCase("fr-FR") ===
          studentToDelete.name.trim().toLocaleLowerCase("fr-FR") &&
        next[0]
      ) {
        setCurrentStudent(next[0]);
      }
      return next;
    });
  };

  const handleStudentImported = (importedStudent: StudentProfile) => {
    setStudents((prev) => {
      const existing = prev.find(
        (s) =>
          s.name.trim().toLocaleLowerCase("fr-FR") ===
          importedStudent.name.trim().toLocaleLowerCase("fr-FR")
      );
      if (existing) {
        return prev;
      }
      return [...prev, importedStudent];
    });
    setCurrentStudent(importedStudent);
  };

  const isOverlayOpen = isSettingsOpen || isHistoryOpen;

  return (
    <div className="flex min-h-screen flex-col bg-cream font-sans text-stone-900">
      <div
        className="flex flex-1 flex-col"
        inert={isOverlayOpen ? true : undefined}
      >
        <Header
          currentStudent={currentStudent}
          dyslexicMode={dyslexicMode}
          onAddStudent={handleAddStudent}
          onDeleteStudent={handleDeleteStudent}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSelectStudent={setCurrentStudent}
          onToggleDyslexicMode={() => setDyslexicMode(!dyslexicMode)}
          students={students}
        />

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
              Mode hors-ligne : les textes, le chronomètre et l’historique
              restent disponibles.
            </span>
          </div>
        )}

        <main className="flex-1 pb-12">
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

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            currentTheme={theme}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onSelectTheme={setTheme}
          />
        </Suspense>
      )}

      {isHistoryOpen && (
        <Suspense fallback={null}>
          <HistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            onStudentImported={handleStudentImported}
            selectedStudent={currentStudent.name}
            selectedStudentLevel={currentStudent.level}
          />
        </Suspense>
      )}
    </div>
  );
};
