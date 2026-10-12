import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ExerciseText, FluencyAttempt, FluencySession, db } from '@/db/db';
import { FLUENCY_NORMS } from '@/lib/utils';
import {
  Trophy,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookmarkCheck,
  Star,
  Printer,
} from 'lucide-react';

interface StepSummaryProps {
  text: ExerciseText;
  studentName: string;
  step1: FluencyAttempt;
  step3: FluencyAttempt;
  onNewSession: () => void;
  onRestartSameText: () => void;
  onOpenHistory: () => void;
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
  const hasSavedRef = useRef(false);

  const delta = step3.mclm - step1.mclm;
  const norm = FLUENCY_NORMS[text.level];
  const target = norm.target;

  // Lance les confettis et enregistre dans Dexie.js (idempotent, garanti une seule fois)
  useEffect(() => {
    // Confetti explosion
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);
    } catch (_) {}

    // Protection stricte contre l'exécution multiple (ex: React StrictMode)
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;

    // Sauvegarde automatique et idempotente dans Dexie
    const saveSession = async () => {
      try {
        // ID déterministe basé sur l'horodatage initial de l'étape 1
        const sessionId = `session-${step1.timestamp || Date.now()}-${studentName}-${text.id}`;
        const session: FluencySession = {
          id: sessionId,
          studentName,
          textId: text.id,
          date: step3.timestamp || Date.now(),
          step1,
          step3,
          progressionDelta: delta,
        };
        await db.sessions.put(session);
        setIsSaved(true);
      } catch (err) {
        console.error("Erreur lors de la sauvegarde de la séance :", err);
      }
    };

    saveSession();
  }, [delta, step1, step3, studentName, text.id]);

  // Déterminer la hauteur relative des barres de l'histogramme comparatif
  const maxBarValue = Math.max(step1.mclm, step3.mclm, target, 50) * 1.15;
  const hStep1 = Math.round((step1.mclm / maxBarValue) * 100);
  const hStep3 = Math.round((step3.mclm / maxBarValue) * 100);
  const hTarget = Math.round((target / maxBarValue) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in-95 duration-400">
      {/* Carte de félicitations */}
      <div className="bg-linear-to-b from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden">
        <div className="inline-flex p-3 bg-white/20 backdrop-blur-md rounded-2xl mb-4 text-amber-300 shadow-inner">
          <Trophy className="w-12 h-12" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black font-fun tracking-wide mb-2">
          Bravo {studentName} ! 🎉
        </h2>
        <p className="text-indigo-100 text-sm sm:text-base max-w-lg mx-auto">
          Tu as complété ton cycle d'entraînement de fluence sur <br />
          <strong className="text-white font-bold">« {text.title} »</strong>
        </p>

        {/* Badge de progression */}
        <div className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-white text-indigo-900 font-extrabold text-base shadow-lg shadow-indigo-950/30">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <span>
            {delta > 0
              ? `Progression de +${delta} mots par minute !`
              : delta === 0
              ? 'Score maintenu avec précision !'
              : `${delta} MCLM`}
          </span>
        </div>

        {isSaved && (
          <div className="text-xs text-indigo-200 mt-4 flex items-center justify-center gap-1.5 opacity-80">
            <BookmarkCheck className="w-4 h-4 text-emerald-400" />
            <span>Séance enregistrée dans ton historique local</span>
          </div>
        )}
      </div>

      {/* Histogramme comparatif : Lecture 1 vs Lecture 3 vs Cible du niveau */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-fun">
              Histogramme comparatif des scores
            </h3>
            <p className="text-xs text-slate-500">
              Mots Correctement Lus en 60s (MCLM) selon le protocole ELFE
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
            Niveau {text.level}
          </span>
        </div>

        {/* Barres du graphique */}
        <div className="h-64 pt-8 pb-4 flex items-end justify-around border-b border-slate-100 px-4 sm:px-12 gap-4">
          {/* Barre 1 : 1ère lecture */}
          <div className="flex-1 flex flex-col items-center h-full justify-end group">
            <div className="text-sm font-bold text-slate-600 mb-2 font-fun">
              {step1.mclm}
            </div>
            <div
              className="w-full max-w-[80px] bg-slate-300 rounded-t-2xl transition-all duration-700 group-hover:bg-slate-400"
              style={{ height: `${Math.max(10, hStep1)}%` }}
            />
            <div className="text-xs font-bold text-slate-500 mt-3 text-center">
              1ère Lecture
            </div>
          </div>

          {/* Barre 2 : Défi Record */}
          <div className="flex-1 flex flex-col items-center h-full justify-end group">
            <div className="text-base font-black text-indigo-600 mb-2 font-fun flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{step3.mclm}</span>
            </div>
            <div
              className="w-full max-w-[80px] bg-linear-to-t from-indigo-600 to-indigo-500 rounded-t-2xl shadow-lg shadow-indigo-200 transition-all duration-700 group-hover:brightness-110"
              style={{ height: `${Math.max(10, hStep3)}%` }}
            />
            <div className="text-xs font-black text-indigo-700 mt-3 text-center">
              Défi Record
            </div>
          </div>

          {/* Barre 3 : Cible du niveau */}
          <div className="flex-1 flex flex-col items-center h-full justify-end group">
            <div className="text-sm font-bold text-emerald-600 mb-2 font-fun">
              {target}
            </div>
            <div
              className="w-full max-w-[80px] bg-emerald-200 border-2 border-dashed border-emerald-400 rounded-t-2xl transition-all duration-700"
              style={{ height: `${Math.max(10, hTarget)}%` }}
            />
            <div className="text-xs font-bold text-emerald-700 mt-3 text-center">
              Cible {text.level}
            </div>
          </div>
        </div>

        {/* Détails chiffrés */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl">
            <span className="text-slate-400">Erreurs évitées</span>
            <div className="text-lg font-bold text-slate-800 font-fun mt-0.5">
              {Math.max(0, step1.errorsCount - step3.errorsCount)} erreur(s) en moins
            </div>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-2xl">
            <span className="text-indigo-400">Mots supplémentaires lus</span>
            <div className="text-lg font-bold text-indigo-700 font-fun mt-0.5">
              +{Math.max(0, step3.wordsAttempted - step1.wordsAttempted)} mots
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl">
            <span className="text-emerald-500">Statut officiel</span>
            <div className="text-lg font-bold text-emerald-800 font-fun mt-0.5">
              {step3.mclm >= target ? 'Objectif validé !' : 'En belle progression'}
            </div>
          </div>
        </div>
      </div>

      {/* Mots travaillés durant la session */}
      {step1.stumbledWords && step1.stumbledWords.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-3xl p-6">
          <h4 className="text-sm font-bold text-amber-900 font-fun mb-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span>Mots consolidés pendant cette séance :</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {step1.stumbledWords.map((word, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-white text-amber-900 font-semibold rounded-xl text-xs border border-amber-200 shadow-2xs"
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
          onClick={() => window.print()}
          className="py-3.5 px-6 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          title="Génère un PDF ou imprime la fiche officielle ELFE / Éduscol"
        >
          <Printer className="w-4 h-4 text-indigo-600" />
          <span>Imprimer la fiche ELFE (PDF)</span>
        </button>

        <button
          onClick={onRestartSameText}
          className="py-3.5 px-6 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Recommencer ce texte</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="py-3.5 px-6 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <BookmarkCheck className="w-4 h-4 text-indigo-600" />
          <span>Voir l'historique complet</span>
        </button>

        <button
          onClick={onNewSession}
          className="py-3.5 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
        >
          <span>Choisir une autre histoire</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* FICHE OFFICIELLE D'ÉVALUATION ELFE (Visible uniquement à l'impression / PDF) */}
      <div className="hidden print-only p-8 bg-white text-slate-900 border border-slate-300 rounded-lg space-y-6 mt-8">
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Fiche d'Évaluation de Fluence de Lecture</h1>
            <p className="text-xs text-slate-600 font-semibold">Protocole ELFE (Évaluation de la Lecture en Fluence) · Normes Cogni-Sciences / Éduscol</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Date : {new Date().toLocaleDateString('fr-FR')}</p>
            <p className="text-slate-600">Application Fluence BYOK</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs">
          <div>
            <span className="text-slate-500 font-semibold">Élève :</span> <strong className="text-sm font-bold">{studentName}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Niveau scolaire :</span> <strong className="text-sm font-bold">{text.level}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Texte support :</span> <strong className="text-sm font-bold">« {text.title} »</strong> ({text.wordCount} mots)
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2">Résultats quantitatifs (MCLM = Mots Lus en 60s - Erreurs)</h2>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 p-2">Passation</th>
                <th className="border border-slate-300 p-2 text-center">Mots tentés (60s)</th>
                <th className="border border-slate-300 p-2 text-center">Erreurs / Omissions</th>
                <th className="border border-slate-300 p-2 text-center font-bold">Score MCLM</th>
                <th className="border border-slate-300 p-2 text-center">Cible attendue ({text.level})</th>
                <th className="border border-slate-300 p-2 text-center">Progression</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 font-semibold">1ère Lecture (Diagnostique)</td>
                <td className="border border-slate-300 p-2 text-center">{step1.wordsAttempted}</td>
                <td className="border border-slate-300 p-2 text-center text-rose-600 font-bold">{step1.errorsCount}</td>
                <td className="border border-slate-300 p-2 text-center text-base font-black">{step1.mclm}</td>
                <td className="border border-slate-300 p-2 text-center">{target} MCLM</td>
                <td className="border border-slate-300 p-2 text-center text-slate-400">—</td>
              </tr>
              <tr className="bg-indigo-50/50">
                <td className="border border-slate-300 p-2 font-bold text-indigo-900">2ème Lecture (Défi Record)</td>
                <td className="border border-slate-300 p-2 text-center font-semibold">{step3.wordsAttempted}</td>
                <td className="border border-slate-300 p-2 text-center text-rose-600 font-bold">{step3.errorsCount}</td>
                <td className="border border-slate-300 p-2 text-center text-base font-black text-indigo-900">{step3.mclm}</td>
                <td className="border border-slate-300 p-2 text-center">{target} MCLM</td>
                <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">
                  {delta >= 0 ? `+${delta} MCLM` : `${delta} MCLM`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {step1.stumbledWords && step1.stumbledWords.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Mots travaillés en remédiation syllabique</h2>
            <p className="text-xs text-slate-700 p-2 bg-slate-50 border border-slate-200 rounded">
              {step1.stumbledWords.join(', ')}
            </p>
          </div>
        )}

        <div className="border border-slate-200 rounded p-3">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2">Observations de l'enseignant / de l'orthophoniste</h2>
          <div className="h-16 border-b border-dashed border-slate-300 mb-2" />
          <div className="flex justify-between items-end pt-2 text-xs text-slate-500">
            <span>Cachet / Signature de l'évaluateur :</span>
            <div className="w-48 border-b border-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
