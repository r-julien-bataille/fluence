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
        message: `Export réussi : ${res.sessionCount} séance(s) (${sizeKb} Ko).`,
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
        summaryParts.push(`${res.addedTexts} texte(s) importé(s)`);
      }

      const details =
        summaryParts.length > 0
          ? summaryParts.join(", ")
          : "aucune nouvelle séance";

      setSyncFeedback({
        message: `Import terminé (${details}).`,
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
      className="fade-in fixed inset-0 z-50 flex animate-in justify-end bg-stone-900/50 backdrop-blur-xs duration-150"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="history-drawer-title"
        aria-modal="true"
        className="slide-in-from-right flex h-full w-full max-w-md animate-in flex-col bg-paper p-5 shadow-xl duration-200"
        role="dialog"
      >
        <div className="flex items-center justify-between border-stone-100 border-b pb-3.5">
          <div>
            <h2
              className="font-bold font-fun text-lg text-stone-900"
              id="history-drawer-title"
            >
              Historique de {selectedStudent}
            </h2>
          </div>
          <button
            aria-label="Fermer l'historique"
            className="cursor-pointer rounded-lg p-1.5 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-cream/60 px-3 py-2 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream disabled:opacity-50"
              disabled={
                isSyncing || !filteredSessions || filteredSessions.length === 0
              }
              onClick={handleExport}
              type="button"
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Exporter ({filteredSessions?.length ?? 0})</span>
            </button>

            <button
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-cream/60 px-3 py-2 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream disabled:opacity-50"
              disabled={isSyncing}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Importer</span>
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
              className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                syncFeedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
              role="status"
            >
              {syncFeedback.type === "success" ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                />
              ) : (
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600"
                />
              )}
              <span>{syncFeedback.message}</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto py-4">
          {!filteredSessions || filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-stone-600">
              <BookOpen
                aria-hidden="true"
                className="mx-auto mb-2 h-8 w-8 opacity-40"
              />
              <p className="font-semibold text-xs">
                Aucune séance enregistrée pour {selectedStudent}.
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

              return (
                <div
                  className="relative rounded-xl border border-stone-200 bg-cream/50 p-3.5 pr-9"
                  key={session.id}
                >
                  <div className="mb-1 flex items-center justify-between text-stone-600 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar aria-hidden="true" className="h-3 w-3" />
                      {dateStr}
                    </span>
                    {level && (
                      <span className="font-semibold text-stone-700">
                        {level}
                      </span>
                    )}
                  </div>

                  <h3 className="mb-2 font-bold text-sm text-stone-900">
                    {title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-stone-600">
                      1re :{" "}
                      <strong className="text-stone-900">
                        {session.step1.mclm}
                      </strong>
                    </span>
                    <span className="text-stone-400">→</span>
                    <span className="text-stone-600">
                      Défi :{" "}
                      <strong className="text-primary-700">
                        {session.step3 ? session.step3.mclm : "-"} MCLM
                      </strong>
                    </span>
                    <span
                      className={`ml-auto rounded px-1.5 py-0.5 font-bold ${
                        delta > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  </div>

                  <button
                    aria-label={`Supprimer la séance ${title}`}
                    className="absolute top-2.5 right-2.5 cursor-pointer rounded p-1 text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => deleteSession(session.id)}
                    title="Supprimer la séance"
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
