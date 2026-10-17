import { BookOpen, History, Settings, Type } from "lucide-react";
import type React from "react";

import { hasStoredApiKey } from "@/lib/gemini/client";

import type { StudentProfile } from "./StudentSelector";
import { StudentSelector } from "./StudentSelector";

interface HeaderProps {
  currentStudent: StudentProfile;
  dyslexicMode: boolean;
  onAddStudent: (student: StudentProfile) => void;
  onDeleteStudent?: (student: StudentProfile) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onSelectStudent: (student: StudentProfile) => void;
  onToggleDyslexicMode: () => void;
  students: StudentProfile[];
}

export const Header: React.FC<HeaderProps> = ({
  currentStudent,
  students,
  onSelectStudent,
  onAddStudent,
  onDeleteStudent,
  onOpenSettings,
  onOpenHistory,
  dyslexicMode,
  onToggleDyslexicMode,
}) => {
  const hasKey = hasStoredApiKey();

  return (
    <header className="sticky top-0 z-40 border-stone-200/80 border-b bg-paper/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <BookOpen aria-hidden="true" className="h-4 w-4" />
          </div>
          <span className="font-bold font-fun text-lg text-stone-900 tracking-tight">
            Fluence
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <StudentSelector
            currentStudent={currentStudent}
            onAddStudent={onAddStudent}
            onDeleteStudent={onDeleteStudent}
            onSelectStudent={onSelectStudent}
            students={students}
          />

          <button
            aria-label="Activer le mode confort de lecture"
            aria-pressed={dyslexicMode}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold text-xs transition-colors ${
              dyslexicMode
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-stone-200 bg-cream/60 text-stone-700 hover:bg-cream"
            }`}
            onClick={onToggleDyslexicMode}
            title="Espacement renforcé et repères de lecture"
            type="button"
          >
            <Type aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Dys</span>
          </button>

          <button
            aria-label="Historique des séances"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-cream/60 px-2.5 py-1.5 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream hover:text-stone-900"
            onClick={onOpenHistory}
            title="Historique des séances"
            type="button"
          >
            <History aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Historique</span>
          </button>

          <button
            aria-label={
              hasKey
                ? "Réglages de l'application"
                : "Réglages : clé API Google non configurée"
            }
            className="relative flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-cream/60 px-2.5 py-1.5 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream hover:text-stone-900"
            onClick={onOpenSettings}
            title="Réglages (Clé Gemini & Thème)"
            type="button"
          >
            <Settings aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Réglages</span>
            {!hasKey && (
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-amber-500"
              />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
