import { BookOpen, History, Settings, Type } from "lucide-react";
import type React from "react";

import { hasStoredApiKey } from "@/lib/gemini/client";

import type { StudentProfile } from "./StudentSelector";
import { StudentSelector } from "./StudentSelector";

interface HeaderProps {
  currentStudent: StudentProfile;
  dyslexicMode: boolean;
  onAddStudent: (student: StudentProfile) => void;
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
  onOpenSettings,
  onOpenHistory,
  dyslexicMode,
  onToggleDyslexicMode,
}) => {
  const hasKey = hasStoredApiKey();

  return (
    <header className="sticky top-0 z-40 border-stone-200/80 border-b bg-paper/80 px-4 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 backdrop-blur-md transition-all sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        {/* Logo & Titre */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-md shadow-primary-200">
            <BookOpen aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black font-fun text-stone-900 text-xl tracking-tight">
                Fluence
              </h1>
            </div>
            <p className="hidden font-sans text-[11px] text-stone-600 sm:block">
              Évaluation et entraînement de lecture du CE1 au CM2
            </p>
          </div>
        </div>

        {/* Actions à droite */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sélecteur de profil élève */}
          <StudentSelector
            currentStudent={currentStudent}
            onAddStudent={onAddStudent}
            onSelectStudent={onSelectStudent}
            students={students}
          />

          {/* Bouton bascule police Dyslexie / Confort de lecture */}
          <button
            aria-label="Activer le mode confort de lecture"
            aria-pressed={dyslexicMode}
            className={`flex cursor-pointer items-center gap-1.5 rounded-2xl border p-2.5 font-bold text-xs transition-colors ${
              dyslexicMode
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-stone-200 bg-paper text-stone-600 hover:bg-cream"
            }`}
            onClick={onToggleDyslexicMode}
            title="Activer la police adaptée à la dyslexie et espacement renforcé"
            type="button"
          >
            <Type aria-hidden="true" className="h-4 w-4" />
            <span className="hidden md:inline">Dys-confort</span>
          </button>

          {/* Bouton Historique */}
          <button
            aria-label="Historique des séances"
            className="cursor-pointer rounded-2xl border border-stone-200 bg-paper p-2.5 text-stone-600 transition-colors hover:bg-cream hover:text-stone-900"
            onClick={onOpenHistory}
            title="Historique des séances"
            type="button"
          >
            <History aria-hidden="true" className="h-4 w-4" />
          </button>

          {/* Bouton Réglages Clé API & Ambiances */}
          <button
            aria-label={
              hasKey
                ? "Réglages de l'application"
                : "Réglages : Clé API Google requise"
            }
            className={`relative cursor-pointer rounded-2xl border p-2.5 transition-colors ${
              hasKey
                ? "border-stone-200 bg-paper text-stone-600 hover:bg-cream hover:text-stone-900"
                : "animate-pulse border-amber-300 bg-amber-50 text-amber-700"
            }`}
            onClick={onOpenSettings}
            title={
              hasKey
                ? "Réglages de l'application"
                : "Réglages : Clé API Google requise"
            }
            type="button"
          >
            <Settings aria-hidden="true" className="h-4 w-4" />
            {!hasKey && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
