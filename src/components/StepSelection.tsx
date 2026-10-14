import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

import type { ExerciseText, FluencyLevel } from "@/db/db";
import { db } from "@/db/db";
import { INITIAL_TEXTS } from "@/db/seeds";
import { FLUENCY_NORMS } from "@/lib/utils";

interface StepSelectionProps {
  onOpenGenerator: () => void;
  onSelectText: (text: ExerciseText) => void;
  studentLevel: FluencyLevel;
  studentName: string;
}

export const StepSelection: React.FC<StepSelectionProps> = ({
  studentName,
  onSelectText,
  onOpenGenerator,
  studentLevel,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>(studentLevel);

  const dbTexts = useLiveQuery(async () => await db.texts.toArray(), []);

  const availableTexts =
    dbTexts && dbTexts.length > 0 ? dbTexts : INITIAL_TEXTS;

  const filteredTexts = availableTexts.filter((t) => {
    if (selectedFilter === "Tous") {
      return true;
    }
    return t.level === selectedFilter;
  });

  return (
    <div className="fade-in animate-in space-y-8 duration-300">
      {/* Bannière de bienvenue personnalisée */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary-600 via-primary-700 to-primary-700 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent opacity-10" />

        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-paper/20 px-3 py-1 font-semibold text-white text-xs backdrop-blur-xs">
              <User className="h-3.5 w-3.5" />
              <span>
                Séance pour {studentName} ({studentLevel})
              </span>
            </div>
            <h2 className="font-extrabold font-fun text-2xl tracking-wide sm:text-3xl">
              Prêt pour l’entraînement de lecture ?
            </h2>
            <p className="mt-1 max-w-xl text-primary-100 text-sm">
              Lis le texte pendant 60 secondes. L’intelligence artificielle
              évalue ta fluence, tes mots lus et t’aide à progresser !
            </p>
          </div>

          <button
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3.5 font-bold text-sm text-stone-900 shadow-amber-900/20 shadow-lg transition-all hover:scale-105 hover:bg-amber-300"
            onClick={onOpenGenerator}
            type="button"
          >
            <Sparkles className="h-5 w-5 text-primary-900" />
            <span>Créer une nouvelle histoire</span>
          </button>
        </div>
      </div>

      {/* Filtres par niveau */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {["Tous", "CE1", "CE2", "CM1", "CM2"].map((lvl) => (
            <button
              className={`rounded-xl px-4 py-2 font-bold text-xs transition-all sm:text-sm ${
                selectedFilter === lvl
                  ? "bg-stone-900 text-white shadow-sm"
                  : "border border-stone-200 bg-paper text-stone-600 hover:bg-stone-100"
              }`}
              key={lvl}
              onClick={() => setSelectedFilter(lvl)}
              type="button"
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="font-medium text-stone-600 text-xs">
          {filteredTexts?.length || 0} texte
          {(filteredTexts?.length || 0) > 1 ? "s" : ""} disponible
          {(filteredTexts?.length || 0) > 1 ? "s" : ""}
        </div>
      </div>

      {/* Grille des textes */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filteredTexts?.map((text) => {
          const norm = FLUENCY_NORMS[text.level];
          return (
            <div
              className="group flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-paper p-6 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
              key={text.id}
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-0.5 font-bold text-primary-700 text-xs">
                      {text.level}
                    </span>
                    <span className="font-medium text-stone-600 text-xs">
                      {text.theme}
                    </span>
                  </div>
                  {text.isCustom && (
                    <span className="rounded-md bg-primary-50 px-2 py-0.5 font-bold text-[10px] text-primary-700">
                      Personnalisé
                    </span>
                  )}
                </div>

                <h3 className="mb-2 font-bold font-fun text-lg text-stone-900 transition-colors group-hover:text-primary-600">
                  {text.title}
                </h3>

                <p className="mb-4 line-clamp-3 text-stone-600 text-xs leading-relaxed sm:text-sm">
                  {text.content}
                </p>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between border-stone-100 border-t py-3 text-stone-600 text-xs">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-stone-500" />
                    <span>{text.wordCount} mots</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 text-primary-500" />
                    <span>Cible : {norm.target} MCLM</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Chrono 60s</span>
                  </span>
                </div>

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white text-xs transition-colors hover:bg-primary-600 group-hover:shadow-md sm:text-sm"
                  onClick={() => onSelectText(text)}
                  type="button"
                >
                  <span>Démarrer la séance</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
