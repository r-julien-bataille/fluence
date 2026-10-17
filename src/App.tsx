import { RotateCcw, WifiOff } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { Header } from "./components/Header";
import { InterruptSessionModal } from "./components/InterruptSessionModal";
import {
  SessionRunner,
  type SessionStateInfo,
} from "./components/SessionRunner";
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
  const [isInterruptModalOpen, setIsInterruptModalOpen] = useState(false);
  const [resetSessionSignal, setResetSessionSignal] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const [sessionState, setSessionState] = useState<SessionStateInfo>({
    isActive: false,
    step: "selection",
    textTitle: null,
  });

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

  // Alerte du navigateur si rechargement manuel ou fermeture pendant une séance active
  useEffect(() => {
    if (!sessionState.isActive) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionState.isActive]);

  // Bloque le pull-to-refresh natif du navigateur mobile pendant une séance active
  useEffect(() => {
    if (!sessionState.isActive) {
      return;
    }

    const originalOverscroll = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = "contain";
    return () => {
      document.body.style.overscrollBehaviorY = originalOverscroll;
    };
  }, [sessionState.isActive]);

  // Détection du geste pull-to-refresh sur mobile en cours de séance
  useEffect(() => {
    if (!sessionState.isActive) {
      setPullDistance(0);
      return;
    }

    let startY = 0;
    let isTracking = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && e.touches.length === 1) {
        startY = e.touches[0].clientY;
        isTracking = true;
      } else {
        isTracking = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking || e.touches.length !== 1) {
        return;
      }
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0 && window.scrollY <= 0) {
        const distance = Math.min(diff * 0.45, 80);
        setPullDistance(distance);
        if (distance > 15 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isTracking) {
        return;
      }
      isTracking = false;
      setPullDistance((current) => {
        if (current >= 45) {
          setIsInterruptModalOpen(true);
        }
        return 0;
      });
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [sessionState.isActive]);

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

  const handleGoHome = () => {
    if (sessionState.isActive) {
      setIsInterruptModalOpen(true);
      return;
    }
    if (sessionState.step !== "selection") {
      setResetSessionSignal((prev) => prev + 1);
    }
  };

  const handleConfirmInterrupt = () => {
    setIsInterruptModalOpen(false);
    setResetSessionSignal((prev) => prev + 1);
  };

  const isOverlayOpen = isSettingsOpen || isHistoryOpen || isInterruptModalOpen;

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
          onGoHome={handleGoHome}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSelectStudent={setCurrentStudent}
          onToggleDyslexicMode={() => setDyslexicMode(!dyslexicMode)}
          students={students}
        />

        {pullDistance > 10 && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed top-16 left-1/2 z-50 -translate-x-1/2 transition-transform"
            style={{ transform: `translate(-50%, ${pullDistance}px)` }}
          >
            <div className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-paper/95 px-3 py-1 font-medium text-stone-700 text-xs shadow-md backdrop-blur-xs">
              <RotateCcw
                className={`h-3.5 w-3.5 transition-transform ${
                  pullDistance >= 45
                    ? "rotate-180 text-amber-600"
                    : "text-stone-500"
                }`}
              />
              <span>
                {pullDistance >= 45
                  ? "Relâcher pour revenir à l'accueil"
                  : "Tirer pour revenir à l'accueil"}
              </span>
            </div>
          </div>
        )}

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
            onRequestInterrupt={() => setIsInterruptModalOpen(true)}
            onSessionStateChange={setSessionState}
            resetSessionSignal={resetSessionSignal}
          />
        </main>

        <SourcesFooter />
      </div>

      <InterruptSessionModal
        isOpen={isInterruptModalOpen}
        onCancel={() => setIsInterruptModalOpen(false)}
        onConfirm={handleConfirmInterrupt}
        textTitle={sessionState.textTitle}
      />

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
