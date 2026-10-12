import React from 'react';
import { Settings, History, BookOpen, Type } from 'lucide-react';
import { StudentSelector, StudentProfile } from './StudentSelector';
import { hasStoredApiKey } from '@/lib/gemini/client';

interface HeaderProps {
  currentStudent: StudentProfile;
  students: StudentProfile[];
  onSelectStudent: (student: StudentProfile) => void;
  onAddStudent: (student: StudentProfile) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  dyslexicMode: boolean;
  onToggleDyslexicMode: () => void;
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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Titre */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 font-fun tracking-tight">
                Fluence
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Protocole ELFE / Éduscol
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans hidden sm:block">
              Évaluation et entraînement de lecture du CE1 au CM2
            </p>
          </div>
        </div>

        {/* Actions à droite */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sélecteur de profil élève */}
          <StudentSelector
            currentStudent={currentStudent}
            students={students}
            onSelectStudent={onSelectStudent}
            onAddStudent={onAddStudent}
          />

          {/* Bouton bascule police Dyslexie / Confort de lecture */}
          <button
            onClick={onToggleDyslexicMode}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              dyslexicMode
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
            }`}
            title="Activer la police adaptée à la dyslexie et espacement renforcé"
          >
            <Type className="w-4 h-4" />
            <span className="hidden md:inline">Dys-confort</span>
          </button>

          {/* Bouton Historique */}
          <button
            onClick={onOpenHistory}
            className="p-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Historique des séances"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Bouton Paramètres Clé API */}
          <button
            onClick={onOpenSettings}
            className={`p-2.5 rounded-2xl border transition-colors relative cursor-pointer ${
              !hasKey
                ? 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="Paramètres de la clé API Google"
          >
            <Settings className="w-4 h-4" />
            {!hasKey && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
