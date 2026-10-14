import confetti from "canvas-confetti";
import {
  ArrowRight,
  BookmarkCheck,
  Printer,
  RotateCcw,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
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

  // Lance les confettis et enregistre dans Dexie.js (idempotent, garanti une seule fois)
  useEffect(() => {
    // Confetti explosion
    try {
      confetti({
        origin: { y: 0.6 },
        particleCount: 100,
        spread: 70,
      });
      setTimeout(() => {
        confetti({
          angle: 60,
          origin: { x: 0 },
          particleCount: 50,
          spread: 55,
        });
        confetti({
          angle: 120,
          origin: { x: 1 },
          particleCount: 50,
          spread: 55,
        });
      }, 400);
    } catch (error) {
      console.debug("Confetti unavailable", error);
    }

    // Protection stricte contre l'exécution multiple (ex: React StrictMode)
    if (hasSavedRef.current) {
      return;
    }
    hasSavedRef.current = true;

    // Sauvegarde automatique et idempotente dans Dexie
    const saveSession = async () => {
      try {
        // ID déterministe basé sur l'horodatage initial de l'étape 1
        const sessionId = `session-${step1.timestamp || Date.now()}-${studentName}-${text.id}`;
        const session: FluencySession = {
          date: step3.timestamp || Date.now(),
          id: sessionId,
          progressionDelta: delta,
          step1,
          step3,
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

  // Déterminer la hauteur relative des barres de l'histogramme comparatif
  const maxBarValue = Math.max(step1.mclm, step3.mclm, target, 50) * 1.15;
  const hStep1 = Math.round((step1.mclm / maxBarValue) * 100);
  const hStep3 = Math.round((step3.mclm / maxBarValue) * 100);
  const hTarget = Math.round((target / maxBarValue) * 100);

  let progressText = `${delta} MCLM`;
  if (delta > 0) {
    progressText = `Progression de +${delta} mots par minute !`;
  } else if (delta === 0) {
    progressText = "Score maintenu avec précision !";
  }

  const sessionDate = new Date(
    step3.timestamp || step1.timestamp || 0
  ).toLocaleDateString("fr-FR");

  return (
    <div className="zoom-in-95 mx-auto max-w-3xl animate-in space-y-8 duration-400">
      {/* Carte de félicitations */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-indigo-600 via-indigo-700 to-purple-800 p-8 text-center text-white shadow-2xl sm:p-10">
        <div className="mb-4 inline-flex rounded-2xl bg-white/20 p-3 text-amber-300 shadow-inner backdrop-blur-md">
          <Trophy className="h-12 w-12" />
        </div>

        <h2 className="mb-2 font-black font-fun text-3xl tracking-wide sm:text-4xl">
          Bravo {studentName} !
        </h2>
        <p className="mx-auto max-w-lg text-indigo-100 text-sm sm:text-base">
          Tu as complété ton cycle d’entraînement de fluence sur <br />
          <strong className="font-bold text-white">« {text.title} »</strong>
        </p>

        {/* Badge de progression */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-extrabold text-base text-indigo-900 shadow-indigo-950/30 shadow-lg">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <span>{progressText}</span>
        </div>

        {isSaved && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-indigo-200 text-xs opacity-80">
            <BookmarkCheck className="h-4 w-4 text-emerald-400" />
            <span>Séance enregistrée dans ton historique local</span>
          </div>
        )}
      </div>

      {/* Histogramme comparatif : Lecture 1 vs Lecture 3 vs Cible du niveau */}
      <div className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold font-fun text-slate-900 text-xl">
              Histogramme comparatif des scores
            </h3>
            <p className="text-slate-500 text-xs">
              Mots Correctement Lus en 60s (MCLM) selon le protocole ELFE
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 font-bold text-indigo-700 text-xs">
            Niveau {text.level}
          </span>
        </div>

        {/* Barres du graphique */}
        <div className="flex h-64 items-end justify-around gap-4 border-slate-100 border-b px-4 pt-8 pb-4 sm:px-12">
          {/* Barre 1 : 1ère lecture */}
          <div className="group flex h-full flex-1 flex-col items-center justify-end">
            <div className="mb-2 font-bold font-fun text-slate-600 text-sm">
              {step1.mclm}
            </div>
            <div
              className="w-full max-w-[80px] rounded-t-2xl bg-slate-300 transition-all duration-700 group-hover:bg-slate-400"
              style={{ height: `${Math.max(10, hStep1)}%` }}
            />
            <div className="mt-3 text-center font-bold text-slate-500 text-xs">
              1ère Lecture
            </div>
          </div>

          {/* Barre 2 : Défi Record */}
          <div className="group flex h-full flex-1 flex-col items-center justify-end">
            <div className="mb-2 flex items-center gap-1 font-black font-fun text-base text-indigo-600">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>{step3.mclm}</span>
            </div>
            <div
              className="w-full max-w-[80px] rounded-t-2xl bg-linear-to-t from-indigo-600 to-indigo-500 shadow-indigo-200 shadow-lg transition-all duration-700 group-hover:brightness-110"
              style={{ height: `${Math.max(10, hStep3)}%` }}
            />
            <div className="mt-3 text-center font-black text-indigo-700 text-xs">
              Défi Record
            </div>
          </div>

          {/* Barre 3 : Cible du niveau */}
          <div className="group flex h-full flex-1 flex-col items-center justify-end">
            <div className="mb-2 font-bold font-fun text-emerald-600 text-sm">
              {target}
            </div>
            <div
              className="w-full max-w-[80px] rounded-t-2xl border-2 border-emerald-400 border-dashed bg-emerald-200 transition-all duration-700"
              style={{ height: `${Math.max(10, hTarget)}%` }}
            />
            <div className="mt-3 text-center font-bold text-emerald-700 text-xs">
              Cible {text.level}
            </div>
          </div>
        </div>

        {/* Détails chiffrés */}
        <div className="grid grid-cols-1 gap-4 pt-2 text-center text-xs sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <span className="text-slate-400">Erreurs évitées</span>
            <div className="mt-0.5 font-bold font-fun text-lg text-slate-800">
              {Math.max(0, step1.errorsCount - step3.errorsCount)} erreur(s) en
              moins
            </div>
          </div>

          <div className="rounded-2xl bg-indigo-50/60 p-3">
            <span className="text-indigo-400">Mots supplémentaires lus</span>
            <div className="mt-0.5 font-bold font-fun text-indigo-700 text-lg">
              +{Math.max(0, step3.wordsAttempted - step1.wordsAttempted)} mots
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-3">
            <span className="text-emerald-500">Statut officiel</span>
            <div className="mt-0.5 font-bold font-fun text-emerald-800 text-lg">
              {step3.mclm >= target
                ? "Objectif validé !"
                : "En belle progression"}
            </div>
          </div>
        </div>
      </div>

      {/* Mots travaillés durant la session */}
      {step1.stumbledWords && step1.stumbledWords.length > 0 && (
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/60 p-6">
          <h4 className="mb-2 flex items-center gap-2 font-bold font-fun text-amber-900 text-sm">
            <Star className="h-4 w-4 text-amber-500" />
            <span>Mots consolidés pendant cette séance :</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {step1.stumbledWords.map((word, idx) => (
              <span
                className="rounded-xl border border-amber-200 bg-white px-3 py-1 font-semibold text-amber-900 text-xs shadow-2xs"
                key={idx}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions de fin de session */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <button
          className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 text-sm shadow-xs transition-colors hover:bg-slate-50"
          onClick={() => window.print()}
          title="Génère un PDF ou imprime la fiche officielle ELFE / Éduscol"
          type="button"
        >
          <Printer className="h-4 w-4 text-indigo-600" />
          <span>Imprimer la fiche ELFE (PDF)</span>
        </button>

        <button
          className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 text-sm transition-colors hover:bg-slate-50"
          onClick={onRestartSameText}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Recommencer ce texte</span>
        </button>

        <button
          className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 text-sm transition-colors hover:bg-slate-50"
          onClick={onOpenHistory}
          type="button"
        >
          <BookmarkCheck className="h-4 w-4 text-indigo-600" />
          <span>Voir l’historique complet</span>
        </button>

        <button
          className="flex cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3.5 font-bold text-sm text-white shadow-indigo-200 shadow-lg transition-all hover:scale-105 hover:bg-indigo-700"
          onClick={onNewSession}
          type="button"
        >
          <span>Choisir une autre histoire</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* FICHE OFFICIELLE D'ÉVALUATION ELFE (Visible uniquement à l'impression / PDF) */}
      <div className="print-only mt-8 hidden space-y-6 rounded-lg border border-slate-300 bg-white p-8 text-slate-900">
        <div className="flex items-start justify-between border-slate-900 border-b-2 pb-4">
          <div>
            <h1 className="font-black text-2xl uppercase tracking-tight">
              Fiche d’Évaluation de Fluence de Lecture
            </h1>
            <p className="font-semibold text-slate-600 text-xs">
              Protocole ELFE (Évaluation de la Lecture en Fluence) · Normes
              Cogni-Sciences / Éduscol
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Date : {sessionDate}</p>
            <p className="text-slate-600">Application Fluence BYOK</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <div>
            <span className="font-semibold text-slate-500">Élève :</span>{" "}
            <strong className="font-bold text-sm">{studentName}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-500">
              Niveau scolaire :
            </span>{" "}
            <strong className="font-bold text-sm">{text.level}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-500">
              Texte support :
            </span>{" "}
            <strong className="font-bold text-sm">« {text.title} »</strong> (
            {text.wordCount} mots)
          </div>
        </div>

        <div>
          <h2 className="mb-2 font-bold text-sm uppercase tracking-wider">
            Résultats quantitatifs (MCLM = Mots Lus en 60s - Erreurs)
          </h2>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 p-2">Passation</th>
                <th className="border border-slate-300 p-2 text-center">
                  Mots tentés (60s)
                </th>
                <th className="border border-slate-300 p-2 text-center">
                  Erreurs / Omissions
                </th>
                <th className="border border-slate-300 p-2 text-center font-bold">
                  Score MCLM
                </th>
                <th className="border border-slate-300 p-2 text-center">
                  Cible attendue ({text.level})
                </th>
                <th className="border border-slate-300 p-2 text-center">
                  Progression
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 font-semibold">
                  1ère Lecture (Diagnostique)
                </td>
                <td className="border border-slate-300 p-2 text-center">
                  {step1.wordsAttempted}
                </td>
                <td className="border border-slate-300 p-2 text-center font-bold text-rose-600">
                  {step1.errorsCount}
                </td>
                <td className="border border-slate-300 p-2 text-center font-black text-base">
                  {step1.mclm}
                </td>
                <td className="border border-slate-300 p-2 text-center">
                  {target} MCLM
                </td>
                <td className="border border-slate-300 p-2 text-center text-slate-400">
                  —
                </td>
              </tr>
              <tr className="bg-indigo-50/50">
                <td className="border border-slate-300 p-2 font-bold text-indigo-900">
                  2ème Lecture (Défi Record)
                </td>
                <td className="border border-slate-300 p-2 text-center font-semibold">
                  {step3.wordsAttempted}
                </td>
                <td className="border border-slate-300 p-2 text-center font-bold text-rose-600">
                  {step3.errorsCount}
                </td>
                <td className="border border-slate-300 p-2 text-center font-black text-base text-indigo-900">
                  {step3.mclm}
                </td>
                <td className="border border-slate-300 p-2 text-center">
                  {target} MCLM
                </td>
                <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">
                  {delta >= 0 ? `+${delta} MCLM` : `${delta} MCLM`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {step1.stumbledWords && step1.stumbledWords.length > 0 && (
          <div>
            <h2 className="mb-1 font-bold text-sm uppercase tracking-wider">
              Mots travaillés en remédiation syllabique
            </h2>
            <p className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-700 text-xs">
              {step1.stumbledWords.join(", ")}
            </p>
          </div>
        )}

        <div className="rounded border border-slate-200 p-3">
          <h2 className="mb-2 font-bold text-sm uppercase tracking-wider">
            Observations de l’enseignant / de l’orthophoniste
          </h2>
          <div className="mb-2 h-16 border-slate-300 border-b border-dashed" />
          <div className="flex items-end justify-between pt-2 text-slate-500 text-xs">
            <span>Cachet / Signature de l’évaluateur :</span>

            <div className="w-48 border-slate-400 border-b" />
          </div>
        </div>
      </div>
    </div>
  );
};
