import { Award, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import type React from "react";

import type { FluencyLevel } from "@/db/db";
import { FLUENCY_NORMS } from "@/lib/utils";

interface MclmGaugeProps {
  level: FluencyLevel;
  mclm: number;
  previousMclm?: number;
  showComparison?: boolean;
}

export const MclmGauge: React.FC<MclmGaugeProps> = ({
  mclm,
  level,
  previousMclm,
  showComparison = false,
}) => {
  const norm = FLUENCY_NORMS[level];
  const { target } = norm;
  const { min } = norm;

  // Pourcentage par rapport à la cible (max 150%)
  const percentage = Math.min(130, Math.round((mclm / target) * 100));

  let statusText = "En entraînement";
  let statusBadgeColor = "bg-amber-100 text-amber-800 border-amber-200";
  let IconComponent = Zap;

  if (mclm >= target) {
    statusText = "Objectif de classe atteint !";
    statusBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    IconComponent = Award;
  } else if (mclm >= min) {
    statusText = "Bonne progression !";
    statusBadgeColor = "bg-primary-100 text-primary-800 border-primary-200";
    IconComponent = CheckCircle2;
  } else {
    statusText = "Courage, chaque entraînement fait progresser !";
    statusBadgeColor = "bg-amber-100 text-amber-800 border-amber-200";
    IconComponent = TrendingUp;
  }

  const delta = previousMclm === undefined ? null : mclm - previousMclm;

  let deltaBadgeClass = "bg-rose-100 text-rose-700";
  if (delta !== null && delta > 0) {
    deltaBadgeClass = "bg-emerald-100 text-emerald-700";
  } else if (delta === 0) {
    deltaBadgeClass = "bg-stone-100 text-stone-600";
  }

  let progressGradient = "bg-linear-to-r from-amber-400 to-orange-500";
  if (mclm >= target) {
    progressGradient = "bg-linear-to-r from-emerald-400 to-teal-500";
  } else if (mclm >= min) {
    progressGradient = "bg-linear-to-r from-primary-400 to-primary-500";
  }

  return (
    <div className="rounded-3xl border border-stone-100 bg-paper p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-bold text-stone-400 text-xs uppercase tracking-wider">
            Score de Fluence ELFE
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-black font-fun text-4xl text-stone-900 sm:text-5xl">
              {mclm}
            </span>
            <span className="font-medium text-sm text-stone-500 sm:text-base">
              MCLM
            </span>
            {delta !== null && (
              <span
                className={`ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold text-xs ${deltaBadgeClass}`}
              >
                {delta > 0 ? `+${delta}` : delta} MCLM
              </span>
            )}
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-2xl border px-3 py-1.5 font-semibold text-xs sm:text-sm ${statusBadgeColor}`}
        >
          <IconComponent className="h-4 w-4 shrink-0" />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Barre de progression avec marqueurs */}
      <div className="space-y-2">
        <div className="relative h-4 overflow-hidden rounded-full bg-stone-100 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progressGradient}`}
            style={{ width: `${Math.max(6, Math.min(100, percentage))}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-1 font-medium text-stone-500 text-xs">
          <span>0</span>
          <span className="font-semibold text-stone-600">
            Repère min : {min}
          </span>
          <span className="font-bold text-primary-600">
            Cible {level} : {target}
          </span>
        </div>
      </div>

      {showComparison && previousMclm !== undefined && (
        <div className="mt-4 grid grid-cols-2 gap-4 border-stone-100 border-t pt-4 text-center">
          <div className="rounded-2xl bg-cream p-3">
            <div className="text-stone-400 text-xs">1ère lecture</div>
            <div className="mt-0.5 font-bold font-fun text-2xl text-stone-700">
              {previousMclm}{" "}
              <span className="font-sans text-stone-400 text-xs">MCLM</span>
            </div>
          </div>
          <div className="rounded-2xl bg-primary-50/60 p-3">
            <div className="font-medium text-primary-700 text-xs">
              Défi Record
            </div>
            <div className="mt-0.5 font-bold font-fun text-2xl text-primary-700">
              {mclm}{" "}
              <span className="font-sans text-primary-600 text-xs">MCLM</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
