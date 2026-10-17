import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";

import type { ExerciseText, FluencyLevel } from "@/db/db";
import { db } from "@/db/db";
import { INITIAL_TEXTS } from "@/db/seeds";
import { normalizeStudentName } from "@/lib/sync-history";
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
  const studentSessions = useLiveQuery(async () => {
    const all = await db.sessions.orderBy("date").toArray();
    const normName = normalizeStudentName(studentName);
    return all.filter((s) => normalizeStudentName(s.studentName) === normName);
  }, [studentName]);

  const availableTexts =
    dbTexts && dbTexts.length > 0 ? dbTexts : INITIAL_TEXTS;

  const filteredTexts = availableTexts.filter((t) => {
    if (selectedFilter === "Tous") {
      return true;
    }
    return t.level === selectedFilter;
  });

  const handleDeleteCustomText = async (
    e: React.MouseEvent,
    textId: string
  ) => {
    e.stopPropagation();
    await db.texts.delete(textId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["Tous", "CE1", "CE2", "CM1", "CM2"].map((lvl) => (
            <button
              className={`cursor-pointer rounded-lg px-3 py-1.5 font-bold text-xs transition-colors ${
                selectedFilter === lvl
                  ? "bg-stone-900 text-white"
                  : "border border-stone-200 bg-paper text-stone-700 hover:bg-stone-100"
              }`}
              key={lvl}
              onClick={() => setSelectedFilter(lvl)}
              type="button"
            >
              {lvl}
            </button>
          ))}
        </div>

        <button
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary-600 bg-paper px-3.5 py-1.5 font-bold text-primary-700 text-xs transition-colors hover:bg-primary-50"
          onClick={onOpenGenerator}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span>Nouvelle histoire sur mesure</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredTexts.map((text) => {
          const norm = FLUENCY_NORMS[text.level];
          const lastSession = studentSessions
            ?.filter((s) => s.textId === text.id)
            .at(-1);
          const lastScore =
            lastSession?.step3?.mclm ?? lastSession?.step1.mclm ?? null;

          return (
            <div
              className="group relative flex flex-col justify-between rounded-xl border border-stone-200 bg-paper p-5 transition-colors hover:border-primary-500"
              key={text.id}
            >
              <div>
                <div className="mb-2 flex items-center justify-between gap-2 text-stone-600 text-xs">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="rounded bg-primary-50 px-2 py-0.5 font-bold text-primary-800">
                      {text.level}
                    </span>
                    <span>{text.theme}</span>
                    {text.isCustom && (
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-700">
                        Sur mesure
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {text.wordCount} mots · Cible {norm.target}
                    </span>
                    {text.isCustom && (
                      <button
                        aria-label={`Supprimer l'histoire ${text.title}`}
                        className="relative z-10 cursor-pointer rounded p-1 text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        onClick={(e) => handleDeleteCustomText(e, text.id)}
                        title="Supprimer cette histoire"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="mb-1.5 font-bold font-fun text-lg text-stone-900 transition-colors group-hover:text-primary-700">
                  <button
                    className="cursor-pointer text-left before:absolute before:inset-0 focus:outline-hidden"
                    onClick={() => onSelectText(text)}
                    type="button"
                  >
                    {text.title}
                  </button>
                </h2>

                <p className="line-clamp-2 text-stone-600 text-xs leading-relaxed sm:text-sm">
                  {text.content}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-stone-100 border-t pt-3 text-xs">
                {lastScore === null ? (
                  <span className="text-stone-600">
                    Non lu par {studentName}
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-800">
                    Dernier score : {lastScore} MCLM
                  </span>
                )}

                <span className="inline-flex items-center gap-1 font-bold text-primary-700">
                  <span>Lire ce texte</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
