import React from 'react';
import { FluencyLevel } from '@/db/db';
import { FLUENCY_NORMS } from '@/lib/utils';
import { Award, Zap, CheckCircle2, TrendingUp } from 'lucide-react';

interface MclmGaugeProps {
  mclm: number;
  level: FluencyLevel;
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
  const target = norm.target;
  const min = norm.min;

  // Pourcentage par rapport à la cible (max 150%)
  const percentage = Math.min(130, Math.round((mclm / target) * 100));

  let statusText = "En entraînement";
  let statusBadgeColor = "bg-amber-100 text-amber-800 border-amber-200";
  let IconComponent = Zap;

  if (mclm >= target) {
    statusText = "Objectif de classe atteint ! 🎉";
    statusBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    IconComponent = Award;
  } else if (mclm >= min) {
    statusText = "Bonne progression ! 🚀";
    statusBadgeColor = "bg-blue-100 text-blue-800 border-blue-200";
    IconComponent = CheckCircle2;
  } else {
    statusText = "Courage, chaque entraînement fait progresser ! 🌱";
    statusBadgeColor = "bg-amber-100 text-amber-800 border-amber-200";
    IconComponent = TrendingUp;
  }

  const delta = previousMclm !== undefined ? mclm - previousMclm : null;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Score de Fluence ELFE
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl sm:text-5xl font-black text-slate-900 font-fun">
              {mclm}
            </span>
            <span className="text-slate-500 font-medium text-sm sm:text-base">MCLM</span>
            {delta !== null && (
              <span
                className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                  delta > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : delta === 0
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta} MCLM
              </span>
            )}
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${statusBadgeColor}`}>
          <IconComponent className="w-4 h-4 shrink-0" />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Barre de progression avec marqueurs */}
      <div className="space-y-2">
        <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              mclm >= target
                ? 'bg-linear-to-r from-emerald-400 to-teal-500'
                : mclm >= min
                ? 'bg-linear-to-r from-blue-400 to-indigo-500'
                : 'bg-linear-to-r from-amber-400 to-orange-500'
            }`}
            style={{ width: `${Math.max(6, Math.min(100, percentage))}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 font-medium px-1">
          <span>0</span>
          <span className="text-slate-600 font-semibold">Repère min : {min}</span>
          <span className="text-indigo-600 font-bold">Cible {level} : {target}</span>
        </div>
      </div>

      {showComparison && previousMclm !== undefined && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-center">
          <div className="bg-slate-50 rounded-2xl p-3">
            <div className="text-xs text-slate-400">1ère lecture</div>
            <div className="text-2xl font-bold text-slate-700 font-fun mt-0.5">
              {previousMclm} <span className="text-xs text-slate-400 font-sans">MCLM</span>
            </div>
          </div>
          <div className="bg-indigo-50/60 rounded-2xl p-3">
            <div className="text-xs text-indigo-500 font-medium">Défi Record</div>
            <div className="text-2xl font-bold text-indigo-700 font-fun mt-0.5">
              {mclm} <span className="text-xs text-indigo-400 font-sans">MCLM</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
