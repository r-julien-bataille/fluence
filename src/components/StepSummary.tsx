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
        <div className="rounded-2xl border border-stone-200 bg-paper p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-stone-100 border-b pb-5">
            <div>
              <h1 className="font-bold font-fun text-2xl text-stone-900 sm:text-3xl">
                Bilan de {studentName}
              </h1>
              <p className="mt-0.5 text-stone-600 text-xs sm:text-sm">
                « {text.title} » · Niveau {text.level}
                {isSaved && " · Enregistré dans l’historique"}
              </p>
            </div>

            <div
              className={`rounded-xl border px-3.5 py-2 text-right ${
                delta > 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-stone-200 bg-cream text-stone-800"
              }`}
            >
              <div className="font-bold font-fun text-xl">
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
            <div className="rounded-xl border border-stone-200/80 bg-cream/60 p-4">
              <div className="font-semibold text-stone-600 text-xs">
                1re lecture
              </div>
              <div className="mt-1 font-bold font-fun text-2xl text-stone-900 sm:text-3xl">
                {step1.mclm}
              </div>
              <div className="mt-0.5 text-[11px] text-stone-600">
                {step1.wordsAttempted} lus · {step1.errorsCount} err.
              </div>
            </div>

            <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4">
              <div className="font-bold text-primary-800 text-xs">
                2e lecture (Défi)
              </div>
              <div className="mt-1 font-bold font-fun text-2xl text-primary-700 sm:text-3xl">
                {step3.mclm}
              </div>
              <div className="mt-0.5 text-[11px] text-primary-800">
                {step3.wordsAttempted} lus · {step3.errorsCount} err.
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
              <div className="font-semibold text-emerald-900 text-xs">
                Attendu {text.level}
              </div>
              <div className="mt-1 font-bold font-fun text-2xl text-emerald-800 sm:text-3xl">
                {target}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-800">
                Mots / min
              </div>
            </div>
          </div>

          <div className="mt-6 flex h-44 items-end justify-around gap-4 rounded-xl border border-stone-100 bg-cream/40 px-6 pt-6 pb-3 sm:px-12">
            <div className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="mb-1.5 font-bold font-fun text-stone-700 text-xs">
                {step1.mclm}
              </div>
              <div
                className="w-full max-w-16 rounded-t-lg bg-stone-300 transition-all duration-500"
                style={{ height: `${Math.max(10, hStep1)}%` }}
              />
              <div className="mt-2 font-semibold text-[11px] text-stone-600">
                Lecture 1
              </div>
            </div>

            <div className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="mb-1.5 font-bold font-fun text-primary-700 text-xs">
                {step3.mclm}
              </div>
              <div
                className="w-full max-w-16 rounded-t-lg bg-primary-600 transition-all duration-500"
                style={{ height: `${Math.max(10, hStep3)}%` }}
              />
              <div className="mt-2 font-bold text-[11px] text-primary-800">
                Défi 60s
              </div>
            </div>

            <div className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="mb-1.5 font-bold font-fun text-emerald-800 text-xs">
                {target}
              </div>
              <div
                className="w-full max-w-16 rounded-t-lg border border-emerald-500 border-dashed bg-emerald-200/80 transition-all duration-500"
                style={{ height: `${Math.max(10, hTarget)}%` }}
              />
              <div className="mt-2 font-semibold text-[11px] text-emerald-800">
                Cible {text.level}
              </div>
            </div>
          </div>

          {step1.stumbledWords && step1.stumbledWords.length > 0 && (
            <div className="mt-5 border-stone-100 border-t pt-4">
              <div className="mb-2 font-semibold text-stone-700 text-xs">
                Mots retravaillés pendant la séance :
              </div>
              <div className="flex flex-wrap gap-1.5">
                {step1.stumbledWords.map((word, idx) => (
                  <span
                    className="rounded-lg border border-stone-200 bg-cream px-2.5 py-1 font-medium text-stone-800 text-xs"
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
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-paper px-4 py-2.5 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream"
              onClick={() => window.print()}
              type="button"
            >
              <Printer className="h-4 w-4 text-stone-600" />
              <span>Imprimer le bilan (PDF)</span>
            </button>

            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-paper px-4 py-2.5 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream"
              onClick={onRestartSameText}
              type="button"
            >
              <RotateCcw className="h-4 w-4 text-stone-600" />
              <span>Recommencer ce texte</span>
            </button>

            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-paper px-4 py-2.5 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream"
              onClick={onOpenHistory}
              type="button"
            >
              <BookmarkCheck className="h-4 w-4 text-stone-600" />
              <span>Historique</span>
            </button>
          </div>

          <button
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 font-bold text-white text-xs transition-colors hover:bg-primary-700 sm:text-sm"
            onClick={onNewSession}
            type="button"
          >
            <span>Choisir un autre texte</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* FICHE OFFICIELLE D'ÉVALUATION ELFE (Visible uniquement à l'impression / PDF) */}
      <div className="print-only mt-8 hidden space-y-6 rounded-lg border border-stone-300 bg-paper p-8 text-stone-900">
        <div className="flex items-start justify-between border-stone-900 border-b-2 pb-4">
          <div>
            <h2 className="font-black text-2xl uppercase tracking-tight">
              Fiche d’Évaluation de Fluence de Lecture
            </h2>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Date : {sessionDate}</p>
            <p className="text-stone-600">Application Fluence</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-md border border-stone-200 bg-cream p-3 text-xs">
          <div>
            <span className="font-semibold text-stone-500">Élève :</span>{" "}
            <strong className="font-bold text-sm">{studentName}</strong>
          </div>
          <div>
            <span className="font-semibold text-stone-500">
              Niveau scolaire :
            </span>{" "}
            <strong className="font-bold text-sm">{text.level}</strong>
          </div>
          <div>
            <span className="font-semibold text-stone-500">
              Texte support :
            </span>{" "}
            <strong className="font-bold text-sm">« {text.title} »</strong> (
            {text.wordCount} mots)
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-bold text-sm uppercase tracking-wider">
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
                <td className="border border-stone-300 p-2 text-center font-black text-base">
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
                <td className="border border-stone-300 p-2 font-bold text-primary-900">
                  2e Lecture (Défi Record)
                </td>
                <td className="border border-stone-300 p-2 text-center font-semibold">
                  {step3.wordsAttempted}
                </td>
                <td className="border border-stone-300 p-2 text-center font-bold text-rose-600">
                  {step3.errorsCount}
                </td>
                <td className="border border-stone-300 p-2 text-center font-black text-base text-primary-900">
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
            <h3 className="mb-1 font-bold text-sm uppercase tracking-wider">
              Mots travaillés en remédiation syllabique
            </h3>
            <p className="rounded border border-stone-200 bg-cream p-2 text-stone-700 text-xs">
              {step1.stumbledWords.join(", ")}
            </p>
          </div>
        )}

        <div className="rounded border border-stone-200 p-3">
          <h3 className="mb-2 font-bold text-sm uppercase tracking-wider">
            Observations de l’enseignant / de l’orthophoniste
          </h3>
          <div className="mb-2 h-16 border-stone-300 border-b border-dashed" />
          <div className="flex items-end justify-between pt-2 text-stone-500 text-xs">
            <span>Cachet / Signature de l’évaluateur :</span>

            <div className="w-48 border-stone-400 border-b" />
          </div>
        </div>
      </div>
    </div>
  );
};
