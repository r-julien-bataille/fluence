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

    // Sauvegarde automatique et idempotente dans Dexie (sans les Blobs audio éphémères)
    const saveSession = async () => {
      try {
        const { audioBlob: _b1, audioUrl: _u1, ...cleanStep1 } = step1;
        const { audioBlob: _b3, audioUrl: _u3, ...cleanStep3 } = step3;
        // ID déterministe basé sur l'horodatage initial de l'étape 1
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
      <div className="no-print space-y-8">
        {/* Carte de félicitations */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-primary-600 via-primary-700 to-primary-800 p-8 text-center text-white shadow-2xl sm:p-10">
          <div className="mb-4 inline-flex rounded-2xl bg-paper/20 p-3 text-amber-300 shadow-inner backdrop-blur-md">
            <Trophy className="h-12 w-12" />
          </div>

          <h2 className="mb-2 font-black font-fun text-3xl tracking-wide sm:text-4xl">
            Bravo {studentName} !
          </h2>
          <p className="mx-auto max-w-lg text-primary-100 text-sm sm:text-base">
            Tu as complété ton cycle d’entraînement de fluence sur <br />
            <strong className="font-bold text-white">« {text.title} »</strong>
          </p>

          {/* Badge de progression */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 font-extrabold text-base text-primary-900 shadow-lg shadow-primary-950/30">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span>{progressText}</span>
          </div>

          {isSaved && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-primary-100 text-xs">
              <BookmarkCheck className="h-4 w-4 text-emerald-300" />
              <span>Séance enregistrée dans ton historique local</span>
            </div>
          )}
        </div>

        {/* Histogramme comparatif : Lecture 1 vs Lecture 3 vs Cible du niveau */}
        <div className="space-y-6 rounded-3xl border border-stone-200/90 bg-paper p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold font-fun text-stone-900 text-xl">
                Histogramme comparatif des scores
              </h3>
              <p className="text-stone-600 text-xs">
                Mots Correctement Lus en 60s (MCLM) selon le protocole ELFE
              </p>
            </div>
            <span className="rounded-full bg-primary-50 px-3 py-1 font-bold text-primary-700 text-xs">
              Niveau {text.level}
            </span>
          </div>

          {/* Barres du graphique */}
          <div className="flex h-64 items-end justify-around gap-4 border-stone-100 border-b px-4 pt-8 pb-4 sm:px-12">
            {/* Barre 1 : 1ère lecture */}
            <div className="group flex h-full flex-1 flex-col items-center justify-end">
              <div className="mb-2 font-bold font-fun text-sm text-stone-600">
                {step1.mclm}
              </div>
              <div
                className="w-full max-w-[80px] rounded-t-2xl bg-stone-300 transition-all duration-700 group-hover:bg-stone-400"
                style={{ height: `${Math.max(10, hStep1)}%` }}
              />
              <div className="mt-3 text-center font-bold text-stone-600 text-xs">
                1ère Lecture
              </div>
            </div>

            {/* Barre 2 : Défi Record */}
            <div className="group flex h-full flex-1 flex-col items-center justify-end">
              <div className="mb-2 flex items-center gap-1 font-black font-fun text-base text-primary-600">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>{step3.mclm}</span>
              </div>
              <div
                className="w-full max-w-[80px] rounded-t-2xl bg-linear-to-t from-primary-600 to-primary-500 shadow-lg shadow-primary-200 transition-all duration-700 group-hover:brightness-110"
                style={{ height: `${Math.max(10, hStep3)}%` }}
              />
              <div className="mt-3 text-center font-black text-primary-700 text-xs">
                Défi Record
              </div>
            </div>

            {/* Barre 3 : Cible du niveau */}
            <div className="group flex h-full flex-1 flex-col items-center justify-end">
              <div className="mb-2 font-bold font-fun text-emerald-700 text-sm">
                {target}
              </div>
              <div
                className="w-full max-w-[80px] rounded-t-2xl border-2 border-emerald-400 border-dashed bg-emerald-200 transition-all duration-700"
                style={{ height: `${Math.max(10, hTarget)}%` }}
              />
              <div className="mt-3 text-center font-bold text-emerald-800 text-xs">
                Cible {text.level}
              </div>
            </div>
          </div>

          {/* Détails chiffrés */}
          <div className="grid grid-cols-1 gap-4 pt-2 text-center text-xs sm:grid-cols-3">
            <div className="rounded-2xl bg-cream p-3">
              <span className="font-medium text-stone-600">
                Erreurs évitées
              </span>
              <div className="mt-0.5 font-bold font-fun text-lg text-stone-800">
                {Math.max(0, step1.errorsCount - step3.errorsCount)} erreur(s)
                en moins
              </div>
            </div>

            <div className="rounded-2xl bg-primary-50/60 p-3">
              <span className="font-medium text-primary-700">
                Mots supplémentaires lus
              </span>
              <div className="mt-0.5 font-bold font-fun text-lg text-primary-700">
                +{Math.max(0, step3.wordsAttempted - step1.wordsAttempted)} mots
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-3">
              <span className="font-medium text-emerald-800">
                Statut officiel
              </span>
              <div className="mt-0.5 font-bold font-fun text-emerald-900 text-lg">
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
                  className="rounded-xl border border-amber-200 bg-paper px-3 py-1 font-semibold text-amber-900 text-xs shadow-2xs"
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
            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-200 bg-paper px-6 py-3.5 font-bold text-sm text-stone-700 shadow-xs transition-colors hover:bg-cream"
            onClick={() => window.print()}
            title="Génère un PDF ou imprime la fiche officielle ELFE / Éduscol"
            type="button"
          >
            <Printer className="h-4 w-4 text-primary-600" />
            <span>Imprimer la fiche ELFE (PDF)</span>
          </button>

          <button
            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-200 bg-paper px-6 py-3.5 font-bold text-sm text-stone-700 transition-colors hover:bg-cream"
            onClick={onRestartSameText}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Recommencer ce texte</span>
          </button>

          <button
            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-200 bg-paper px-6 py-3.5 font-bold text-sm text-stone-700 transition-colors hover:bg-cream"
            onClick={onOpenHistory}
            type="button"
          >
            <BookmarkCheck className="h-4 w-4 text-primary-600" />
            <span>Voir l’historique complet</span>
          </button>

          <button
            className="flex cursor-pointer items-center gap-2 rounded-2xl bg-primary-600 px-8 py-3.5 font-bold text-sm text-white shadow-lg shadow-primary-200 transition-all hover:scale-105 hover:bg-primary-700"
            onClick={onNewSession}
            type="button"
          >
            <span>Choisir une autre histoire</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* FICHE OFFICIELLE D'ÉVALUATION ELFE (Visible uniquement à l'impression / PDF) */}
      <div className="print-only mt-8 hidden space-y-6 rounded-lg border border-stone-300 bg-paper p-8 text-stone-900">
        <div className="flex items-start justify-between border-stone-900 border-b-2 pb-4">
          <div>
            <h1 className="font-black text-2xl uppercase tracking-tight">
              Fiche d’Évaluation de Fluence de Lecture
            </h1>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Date : {sessionDate}</p>
            <p className="text-stone-600">Application Fluence BYOK</p>
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
          <h2 className="mb-2 font-bold text-sm uppercase tracking-wider">
            Résultats quantitatifs (MCLM = Mots Lus en 60s - Erreurs)
          </h2>
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
                  1ère Lecture (Diagnostique)
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
                  2ème Lecture (Défi Record)
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
            <h2 className="mb-1 font-bold text-sm uppercase tracking-wider">
              Mots travaillés en remédiation syllabique
            </h2>
            <p className="rounded border border-stone-200 bg-cream p-2 text-stone-700 text-xs">
              {step1.stumbledWords.join(", ")}
            </p>
          </div>
        )}

        <div className="rounded border border-stone-200 p-3">
          <h2 className="mb-2 font-bold text-sm uppercase tracking-wider">
            Observations de l’enseignant / de l’orthophoniste
          </h2>
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
