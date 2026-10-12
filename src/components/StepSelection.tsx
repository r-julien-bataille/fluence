import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ExerciseText, FluencyLevel } from '@/db/db';
import { INITIAL_TEXTS } from '@/db/seeds';
import { BookOpen, Sparkles, Clock, Target, ArrowRight, User } from 'lucide-react';
import { FLUENCY_NORMS } from '@/lib/utils';

interface StepSelectionProps {
  studentName: string;
  onSelectText: (text: ExerciseText) => void;
  onOpenGenerator: () => void;
  studentLevel: FluencyLevel;
}

export const StepSelection: React.FC<StepSelectionProps> = ({
  studentName,
  onSelectText,
  onOpenGenerator,
  studentLevel,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>(studentLevel);

  const dbTexts = useLiveQuery(async () => {
    return await db.texts.toArray();
  }, []);

  const availableTexts = (dbTexts && dbTexts.length > 0) ? dbTexts : INITIAL_TEXTS;

  const filteredTexts = availableTexts.filter((t) => {
    if (selectedFilter === 'Tous') return true;
    return t.level === selectedFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Bannière de bienvenue personnalisée */}
      <div className="bg-linear-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs mb-3">
              <User className="w-3.5 h-3.5" />
              <span>Séance pour {studentName} ({studentLevel})</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-fun tracking-wide">
              Prêt pour l'entraînement de lecture ?
            </h2>
            <p className="text-indigo-100 text-sm mt-1 max-w-xl">
              Lis le texte pendant 60 secondes. L'intelligence artificielle évalue ta fluence, tes mots lus et t'aide à progresser !
            </p>
          </div>

          <button
            onClick={onOpenGenerator}
            className="shrink-0 px-5 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-2xl font-bold text-sm shadow-lg shadow-amber-900/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-indigo-900" />
            <span>Créer une nouvelle histoire</span>
          </button>
        </div>
      </div>

      {/* Filtres par niveau */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['Tous', 'CE1', 'CE2', 'CM1', 'CM2'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedFilter(lvl)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                selectedFilter === lvl
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-600 font-medium">
          {filteredTexts?.length || 0} texte{(filteredTexts?.length || 0) > 1 ? 's' : ''} disponible{(filteredTexts?.length || 0) > 1 ? 's' : ''}
        </div>
      </div>

      {/* Grille des textes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredTexts?.map((text) => {
          const norm = FLUENCY_NORMS[text.level];
          return (
            <div
              key={text.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {text.level}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {text.theme}
                    </span>
                  </div>
                  {text.isCustom && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700">
                      Personnalisé
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors font-fun mb-2">
                  {text.title}
                </h3>

                <p className="text-slate-600 text-xs sm:text-sm line-clamp-3 leading-relaxed mb-4">
                  {text.content}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 py-3 border-t border-slate-100 mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span>{text.wordCount} mots</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Cible : {norm.target} MCLM</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Chrono 60s</span>
                  </span>
                </div>

                <button
                  onClick={() => onSelectText(text)}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 group-hover:shadow-md"
                >
                  <span>Démarrer la séance</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
