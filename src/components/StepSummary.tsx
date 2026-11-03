import confetti from "canvas-confetti";
import { ArrowRight, BookmarkCheck, Printer, RotateCcw } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import type { ExerciseText, FluencyAttempt, FluencySession } from "@/db/db";
import { db } from "@/db/db";
import { FLUENCY_NORMS } from "@/lib/utils";

interface StepSummaryProps {
  onNewSession: () => void;
  onOpenHistory: () => void;
  onRestartSameText: () => void;
  step1: FluencyAttempt;
  step3: FluencyAttempt;
  studentName: string;
  text: ExerciseText;
}

export const StepSummary: React.FC<StepSummaryProps> = ({
  text,
  studentName,
  step1,
  step3,
  onNewSession,
  onRestartSameText,
  onOpenHistory,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const hasSavedRef = useRef<boolean>(false);

  const delta = step3.mclm - step1.mclm;
  const norm = FLUENCY_NORMS[text.level];
  const { target } = norm;

  useEffect(() => {
    try {
      confetti({
        origin: { y: 0.65 },
        particleCount: 60,
        spread: 60,
      });
    } catch (error) {
      console.debug("Confetti unavailable", error);
    }

    if (hasSavedRef.current) {
      return;
    }
    hasSavedRef.current = true;

    const saveSession = async () => {
      try {
        const { audioBlob: _b1, audioUrl: _u1, ...cleanStep1 } = step1;
        const { audioBlob: _b3, audioUrl: _u3, ...cleanStep3 } = step3;
        const sessionId = `session-${step1.timestamp || Date.now()}-${studentName}-${text.id}`;
        const session: FluencySession = {
          date: step3.timestamp || Date.now(),
          id: sessionId,
          progressionDelta: delta,
          step1: cleanStep1,
          step3: cleanStep3,
          studentName,
          textId: text.id,
        };
        await db.sessions.put(session);
        setIsSaved(true);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde de la séance :", error);
      }
    };

    saveSession();
  }, [delta, step1, step3, studentName, text.id]);

  const maxBarValue = Math.max(step1.mclm, step3.mclm, target, 50) * 1.15;
  const hStep1 = Math.round((step1.mclm / maxBarValue) * 100);
  const hStep3 = Math.round((step3.mclm / maxBarValue) * 100);
  const hTarget = Math.round((target / maxBarValue) * 100);

  const sessionDate = new Date(
    step3.timestamp || step1.timestamp || 0
  ).toLocaleDateString("fr-FR");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="no-print space-y-6">
        <div className="bg-paper rounded-2xl border border-stone-200 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <h1 className="font-fun text-2xl font-bold text-stone-900 sm:text-3xl">
                Bilan de {studentName}
              </h1>
              <p className="mt-0.5 text-xs text-stone-600 sm:text-sm">
                « {text.title} » · Niveau {text.level}
                {isSaved && " · Enregistré dans l’historique"}
              </p>
            </div>

            <div
              className={`rounded-xl border px-3.5 py-2 text-right ${
                delta > 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "bg-cream border-stone-200 text-stone-800"
              }`}
            >
              <div className="font-fun text-xl font-bold">
                {delta > 0 ? `+${delta} MCLM` : `${delta} MCLM`}
              </div>
              <div className="text-[11px] opacity-80">
                {step3.mclm >= target
                  ? `Cible ${text.level} atteinte (${target})`
                  : `Cible ${text.level} : ${target} MCLM`}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="bg-cream/60 rounded-xl border border-stone-200/80 p-4">
              <div className="text-xs font-semibold text-stone-600">
                1re lecture
              </div>
              <div className="font-fun mt-1 text-2xl font-bold text-stone-900 sm:text-3xl">
                {step1.mclm}
              </div>
              <div className="mt-0.5 text-[11px] text-stone-600">
                {step1.wordsAttempted} lus · {step1.errorsCount} err.
              </div>
            </div>

            <div className="border-primary-200 bg-primary-50/60 rounded-xl border p-4">
              <div className="text-primary-800 text-xs font-bold">
                2e lecture (Défi)
              </div>
              <div className="font-fun text-primary-700 mt-1 text-2xl font-bold sm:text-3xl">
                {step3.mclm}
              </div>
              <div className="text-primary-800 mt-0.5 text-[11px]">
                {step3.wordsAttempted} lus · {step3.errorsCount} err.
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
              <div className="text-xs font-semibold text-emerald-900">
                Attendu {text.level}
              </div>
              <div className="font-fun mt-1 text-2xl font-bold text-emerald-800 sm:text-3xl">
                {target}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-800">
                Mots / min
              </div>
            </div>
          </div>

          <div className="bg-cream/40 mt-6 flex h-44 items-end justify-around gap-4 rounded-xl border border-stone-100 px-6 pt-6 pb-3 sm:px-12">
            <div className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="font-fun mb-1.5 text-xs font-bold text-stone-700">
                {step1.mclm}
              </div>
              <div
                className="w-full max-w-16 rounded-t-lg bg-stone-300 transition-all duration-500"
                style={{ height: `${Math.max(10, hStep1)}%` }}
              />
              <div className="mt-2 text-[11px] font-semibold text-stone-600">
                Lecture 1
              </div>
            </div>

            <div className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="font-fun text-primary-700 mb-1.5 text-xs font-bold">
                {step3.mclm}
              </div>
              <div
                className="bg-primary-600 w-full max-w-16 rounded-t-lg transition-all duration-500"
                style={{ height: `${Math.max(10, hStep3)}%` }}
              />
              <div className="text-primary-800 mt-2 text-[11px] font-bold">
                Défi 60s
              </div>
            </div>

            <div className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="font-fun mb-1.5 text-xs font-bold text-emerald-800">
                {target}
              </div>
              <div
                className="w-full max-w-16 rounded-t-lg border border-dashed border-emerald-500 bg-emerald-200/80 transition-all duration-500"
                style={{ height: `${Math.max(10, hTarget)}%` }}
              />
              <div className="mt-2 text-[11px] font-semibold text-emerald-800">
                Cible {text.level}
              </div>
            </div>
          </div>

          {step1.stumbledWords && step1.stumbledWords.length > 0 && (
            <div className="mt-5 border-t border-stone-100 pt-4">
              <div className="mb-2 text-xs font-semibold text-stone-700">
                Mots retravaillés pendant la séance :
              </div>
              <div className="flex flex-wrap gap-1.5">
                {step1.stumbledWords.map((word, idx) => (
                  <span
                    className="bg-cream rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-800"
                    key={idx}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="bg-paper hover:bg-cream flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 transition-colors"
              onClick={() => window.print()}
              type="button"
            >
              <Printer className="h-4 w-4 text-stone-600" />
              <span>Imprimer le bilan (PDF)</span>
            </button>

            <button
              className="bg-paper hover:bg-cream flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 transition-colors"
              onClick={onRestartSameText}
              type="button"
            >
              <RotateCcw className="h-4 w-4 text-stone-600" />
              <span>Recommencer ce texte</span>
            </button>

            <button
              className="bg-paper hover:bg-cream flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 transition-colors"
              onClick={onOpenHistory}
              type="button"
            >
              <BookmarkCheck className="h-4 w-4 text-stone-600" />
              <span>Historique</span>
            </button>
          </div>

          <button
            className="bg-primary-600 hover:bg-primary-700 flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-colors sm:text-sm"
            onClick={onNewSession}
            type="button"
          >
            <span>Choisir un autre texte</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* FICHE OFFICIELLE D'ÉVALUATION ELFE (Visible uniquement à l'impression / PDF) */}
      <div className="print-only bg-paper mt-8 hidden space-y-6 rounded-lg border border-stone-300 p-8 text-stone-900">
        <div className="flex items-start justify-between border-b-2 border-stone-900 pb-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight uppercase">
              Fiche d’Évaluation de Fluence de Lecture
            </h2>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Date : {sessionDate}</p>
            <p className="text-stone-600">Application Fluence</p>
          </div>
        </div>

        <div className="bg-cream grid grid-cols-3 gap-4 rounded-md border border-stone-200 p-3 text-xs">
          <div>
            <span className="font-semibold text-stone-500">Élève :</span>{" "}
            <strong className="text-sm font-bold">{studentName}</strong>
          </div>
          <div>
            <span className="font-semibold text-stone-500">
              Niveau scolaire :
            </span>{" "}
            <strong className="text-sm font-bold">{text.level}</strong>
          </div>
          <div>
            <span className="font-semibold text-stone-500">
              Texte support :
            </span>{" "}
            <strong className="text-sm font-bold">« {text.title} »</strong> (
            {text.wordCount} mots)
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold tracking-wider uppercase">
            Résultats quantitatifs (MCLM = Mots Lus en 60s - Erreurs)
          </h3>
          <table className="w-full border-collapse border border-stone-300 text-xs">
            <thead>
              <tr className="bg-stone-100 text-left">
                <th className="border border-stone-300 p-2">Passation</th>
                <th className="border border-stone-300 p-2 text-center">
                  Mots tentés (60s)
                </th>
                <th className="border border-stone-300 p-2 text-center">
                  Erreurs / Omissions
                </th>
                <th className="border border-stone-300 p-2 text-center font-bold">
                  Score MCLM
                </th>
                <th className="border border-stone-300 p-2 text-center">
                  Cible attendue ({text.level})
                </th>
                <th className="border border-stone-300 p-2 text-center">
                  Progression
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-stone-300 p-2 font-semibold">
                  1re Lecture (Diagnostique)
                </td>
                <td className="border border-stone-300 p-2 text-center">
                  {step1.wordsAttempted}
                </td>
                <td className="border border-stone-300 p-2 text-center font-bold text-rose-600">
                  {step1.errorsCount}
                </td>
                <td className="border border-stone-300 p-2 text-center text-base font-black">
                  {step1.mclm}
                </td>
                <td className="border border-stone-300 p-2 text-center">
                  {target} MCLM
                </td>
                <td className="border border-stone-300 p-2 text-center text-stone-400">
                  —
                </td>
              </tr>
              <tr className="bg-primary-50/50">
                <td className="text-primary-900 border border-stone-300 p-2 font-bold">
                  2e Lecture (Défi Record)
                </td>
                <td className="border border-stone-300 p-2 text-center font-semibold">
                  {step3.wordsAttempted}
                </td>
                <td className="border border-stone-300 p-2 text-center font-bold text-rose-600">
                  {step3.errorsCount}
                </td>
                <td className="text-primary-900 border border-stone-300 p-2 text-center text-base font-black">
                  {step3.mclm}
                </td>
                <td className="border border-stone-300 p-2 text-center">
                  {target} MCLM
                </td>
                <td className="border border-stone-300 p-2 text-center font-bold text-emerald-700">
                  {delta >= 0 ? `+${delta} MCLM` : `${delta} MCLM`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {step1.stumbledWords && step1.stumbledWords.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-bold tracking-wider uppercase">
              Mots travaillés en remédiation syllabique
            </h3>
            <p className="bg-cream rounded border border-stone-200 p-2 text-xs text-stone-700">
              {step1.stumbledWords.join(", ")}
            </p>
          </div>
        )}

        <div className="rounded border border-stone-200 p-3">
          <h3 className="mb-2 text-sm font-bold tracking-wider uppercase">
            Observations de l’enseignant / de l’orthophoniste
          </h3>
          <div className="mb-2 h-16 border-b border-dashed border-stone-300" />
          <div className="flex items-end justify-between pt-2 text-xs text-stone-500">
            <span>Cachet / Signature de l’évaluateur :</span>

            <div className="w-48 border-b border-stone-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
