import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Calendar, Trash2, X } from "lucide-react";
import type React from "react";

import type { FluencySession } from "@/db/db";
import { db } from "@/db/db";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: string;
}

const deleteSession = async (id: string) => {
  await db.sessions.delete(id);
};

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  selectedStudent,
}) => {
  const sessions = useLiveQuery(async () => {
    const list = await db.sessions.orderBy("date").toArray();
    return list.toReversed();
  }, []);

  const texts = useLiveQuery(async () => await db.texts.toArray(), []);

  if (!isOpen) {
    return null;
  }

  const filteredSessions = sessions?.filter((s) =>
    selectedStudent === "Tous" ? true : s.studentName === selectedStudent
  );

  const getTextTitle = (textId: string) => {
    const found = texts?.find((t) => t.id === textId);
    return found ? found.title : "Texte";
  };

  const getTextLevel = (textId: string) => {
    const found = texts?.find((t) => t.id === textId);
    return found ? found.level : "";
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in justify-end bg-slate-900/50 backdrop-blur-xs duration-200">
      <div className="slide-in-from-right flex h-full w-full max-w-md animate-in flex-col bg-white p-6 shadow-2xl duration-300">
        <div className="flex items-center justify-between border-slate-100 border-b pb-4">
          <div>
            <h3 className="font-bold font-fun text-slate-900 text-xl">
              Historique des séances
            </h3>
            <p className="text-slate-500 text-xs">
              {selectedStudent === "Tous"
                ? "Tous les élèves"
                : `Élève : ${selectedStudent}`}
            </p>
          </div>
          <button
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {!filteredSessions || filteredSessions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p className="font-semibold text-sm">
                Aucune séance enregistrée pour le moment.
              </p>
              <p className="mt-1 text-xs">
                Complétez une session de lecture pour voir les progrès !
              </p>
            </div>
          ) : (
            filteredSessions.map((session: FluencySession) => {
              const delta = session.progressionDelta ?? 0;
              const title = getTextTitle(session.textId);
              const level = getTextLevel(session.textId);
              const dateStr = new Date(session.date).toLocaleDateString(
                "fr-FR",
                {
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                }
              );

              let deltaColor = "text-rose-600";
              if (delta > 0) {
                deltaColor = "text-emerald-600";
              } else if (delta === 0) {
                deltaColor = "text-slate-500";
              }

              return (
                <div
                  className="group relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-shadow hover:shadow-xs"
                  key={session.id}
                >
                  <div className="mb-2 flex items-center justify-between text-slate-500 text-xs">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateStr}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">
                      {session.studentName} {level && `(${level})`}
                    </span>
                  </div>

                  <h4 className="mb-3 font-bold text-slate-900 text-sm">
                    {title}
                  </h4>

                  <div className="mb-2 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-white p-2.5 text-center">
                    <div>
                      <div className="font-semibold text-[10px] text-slate-400 uppercase">
                        1ère lecture
                      </div>
                      <div className="font-bold font-fun text-base text-slate-700">
                        {session.step1.mclm}{" "}
                        <span className="font-sans text-[10px]">MCLM</span>
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-[10px] text-slate-400 uppercase">
                        Défi final
                      </div>
                      <div className="font-bold font-fun text-base text-indigo-700">
                        {session.step3 ? session.step3.mclm : "-"}{" "}
                        <span className="font-sans text-[10px]">MCLM</span>
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-[10px] text-slate-400 uppercase">
                        Gain
                      </div>
                      <div
                        className={`font-bold font-fun text-base ${deltaColor}`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </div>
                    </div>
                  </div>

                  {session.step1.stumbledWords.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-slate-500 text-xs">
                      <span className="font-semibold text-[10px] text-slate-400">
                        Mots travaillés :
                      </span>
                      {session.step1.stumbledWords.map((w, idx) => (
                        <span
                          className="rounded bg-amber-100/70 px-1.5 py-0.5 text-[11px] text-amber-900"
                          key={idx}
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    className="absolute top-3 right-3 p-1 text-slate-300 transition-colors hover:text-rose-500"
                    onClick={() => deleteSession(session.id)}
                    title="Supprimer la session"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
