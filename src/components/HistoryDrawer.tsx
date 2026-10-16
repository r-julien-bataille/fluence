import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import type { FluencyLevel, FluencySession } from "@/db/db";
import { db } from "@/db/db";
import {
  exportStudentHistoryToFile,
  importStudentHistoryFromFile,
  normalizeStudentName,
} from "@/lib/sync-history";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentImported?: (student: { level: FluencyLevel; name: string }) => void;
  selectedStudent: string;
  selectedStudentLevel?: FluencyLevel;
}

const deleteSession = async (id: string) => {
  await db.sessions.delete(id);
};

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  selectedStudent,
  selectedStudentLevel,
  onStudentImported,
}) => {
  const [syncFeedback, setSyncFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessions = useLiveQuery(async () => {
    const list = await db.sessions.orderBy("date").toArray();
    return list.toReversed();
  }, []);

  const texts = useLiveQuery(async () => await db.texts.toArray(), []);

  useEffect(() => {
    if (!isOpen) {
      setSyncFeedback(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const filteredSessions = sessions?.filter((s) =>
    selectedStudent === "Tous"
      ? true
      : normalizeStudentName(s.studentName) ===
        normalizeStudentName(selectedStudent)
  );

  const getTextTitle = (textId: string) => {
    const found = texts?.find((t) => t.id === textId);
    return found ? found.title : "Texte";
  };

  const getTextLevel = (textId: string) => {
    const found = texts?.find((t) => t.id === textId);
    return found ? found.level : "";
  };

  const handleExport = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await exportStudentHistoryToFile({
        studentLevel: selectedStudentLevel,
        studentName: selectedStudent,
      });
      const sizeKb = Math.max(0.1, Math.round((res.byteSize / 1024) * 10) / 10);
      setSyncFeedback({
        message: `Export réussi : ${res.sessionCount} séance(s) pour ${selectedStudent} (${sizeKb} Ko).`,
        type: "success",
      });
    } catch (error: unknown) {
      setSyncFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'export de l'historique.",
        type: "error",
      });
    }
    setIsSyncing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await importStudentHistoryFromFile(file);
      if (res.studentProfile && onStudentImported) {
        onStudentImported(res.studentProfile);
      }

      const summaryParts: string[] = [];
      if (res.addedSessions > 0) {
        summaryParts.push(`${res.addedSessions} séance(s) ajoutée(s)`);
      }
      if (res.updatedSessions > 0) {
        summaryParts.push(`${res.updatedSessions} enrichie(s)`);
      }
      if (res.duplicateSkippedSessions > 0) {
        summaryParts.push(
          `${res.duplicateSkippedSessions} doublon(s) ignoré(s)`
        );
      }
      if (res.addedTexts > 0) {
        summaryParts.push(`${res.addedTexts} texte(s) sur mesure importé(s)`);
      }

      const details =
        summaryParts.length > 0
          ? summaryParts.join(", ")
          : "aucune nouvelle séance à importer";

      setSyncFeedback({
        message: `Synchronisation terminée (${details}).`,
        type: "success",
      });
    } catch (error: unknown) {
      setSyncFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'import du fichier.",
        type: "error",
      });
    }
    setIsSyncing(false);
  };

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex animate-in justify-end bg-stone-900/50 backdrop-blur-xs duration-200"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="history-drawer-title"
        aria-modal="true"
        className="slide-in-from-right flex h-full w-full max-w-md animate-in flex-col bg-paper p-6 shadow-2xl duration-300"
        role="dialog"
      >
        <div className="flex items-center justify-between border-stone-100 border-b pb-4">
          <div>
            <h2
              className="font-bold font-fun text-stone-900 text-xl"
              id="history-drawer-title"
            >
              Historique des séances
            </h2>
            <p className="text-stone-600 text-xs">
              {selectedStudent === "Tous"
                ? "Tous les élèves"
                : `Élève : ${selectedStudent}`}
            </p>
          </div>
          <button
            aria-label="Fermer l'historique"
            className="cursor-pointer rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={onClose}
            title="Fermer"
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {/* Barre de synchronisation Export / Import (.fluence) */}
        <div className="mt-4 rounded-2xl border border-stone-200/80 bg-cream/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-stone-800 text-xs">
              Synchroniser ({selectedStudent})
            </span>
            <span className="rounded-full bg-primary-50 px-2 py-0.5 font-mono font-semibold text-[10px] text-primary-700">
              Format .fluence (GZIP)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-paper px-3 py-2 font-bold text-stone-700 text-xs shadow-2xs transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                isSyncing || !filteredSessions || filteredSessions.length === 0
              }
              onClick={handleExport}
              title={`Exporter les séances de ${selectedStudent} dans un fichier compact .fluence`}
              type="button"
            >
              <Download
                aria-hidden="true"
                className="h-3.5 w-3.5 text-primary-600"
              />
              <span>Exporter ({filteredSessions?.length ?? 0})</span>
            </button>

            <button
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 font-bold text-white text-xs shadow-2xs transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSyncing}
              onClick={() => fileInputRef.current?.click()}
              title="Importer et fusionner un fichier d'historique (.fluence ou .json) sans doublon"
              type="button"
            >
              <Upload aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Importer / Fusionner</span>
            </button>
            <input
              accept=".fluence,.json,application/json,application/octet-stream"
              aria-label="Importer un fichier d'historique Fluence"
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
          </div>

          {syncFeedback && (
            <div
              aria-live="polite"
              className={`mt-2.5 flex items-start gap-2 rounded-xl border p-2.5 text-xs ${
                syncFeedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
              role="status"
            >
              {syncFeedback.type === "success" ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                />
              ) : (
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                />
              )}
              <span className="leading-snug">{syncFeedback.message}</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {!filteredSessions || filteredSessions.length === 0 ? (
            <div className="py-16 text-center text-stone-600">
              <BookOpen
                aria-hidden="true"
                className="mx-auto mb-3 h-12 w-12 opacity-40"
              />
              <p className="font-semibold text-sm">
                Aucune séance enregistrée pour {selectedStudent}.
              </p>
              <p className="mt-1 text-xs">
                Complétez une session de lecture ou importez un fichier{" "}
                <code>.fluence</code> !
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
                deltaColor = "text-emerald-700";
              } else if (delta === 0) {
                deltaColor = "text-stone-600";
              }

              return (
                <div
                  className="group relative rounded-2xl border border-stone-200 bg-cream/70 p-4 pr-10 transition-shadow hover:shadow-xs"
                  key={session.id}
                >
                  <div className="mb-2 flex items-center justify-between text-stone-600 text-xs">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
                      {dateStr}
                    </span>
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 font-bold text-primary-700">
                      {session.studentName} {level && `(${level})`}
                    </span>
                  </div>

                  <h3 className="mb-3 font-bold text-sm text-stone-900">
                    {title}
                  </h3>

                  <div className="mb-2 grid grid-cols-3 gap-2 rounded-xl border border-stone-100 bg-paper p-2.5 text-center">
                    <div>
                      <div className="font-semibold text-[10px] text-stone-600 uppercase">
                        1ère lecture
                      </div>
                      <div className="font-bold font-fun text-base text-stone-800">
                        {session.step1.mclm}{" "}
                        <span className="font-sans text-[10px]">MCLM</span>
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-[10px] text-stone-600 uppercase">
                        Défi final
                      </div>
                      <div className="font-bold font-fun text-base text-primary-700">
                        {session.step3 ? session.step3.mclm : "-"}{" "}
                        <span className="font-sans text-[10px]">MCLM</span>
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-[10px] text-stone-600 uppercase">
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
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-stone-600 text-xs">
                      <span className="font-semibold text-[10px] text-stone-600">
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
                    aria-label={`Supprimer la séance ${title}`}
                    className="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => deleteSession(session.id)}
                    title="Supprimer la session"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
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
