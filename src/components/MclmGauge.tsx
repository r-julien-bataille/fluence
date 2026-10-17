import type React from "react";

import type { FluencyLevel } from "@/db/db";
import { FLUENCY_NORMS } from "@/lib/utils";

interface MclmGaugeProps {
  errorsCount?: number;
  hesitationsCount?: number;
  level: FluencyLevel;
  mclm: number;
  previousMclm?: number;
  wordsAttempted?: number;
}

export const MclmGauge: React.FC<MclmGaugeProps> = ({
  mclm,
  level,
  previousMclm,
  wordsAttempted,
  errorsCount,
  hesitationsCount,
}) => {
  const norm = FLUENCY_NORMS[level];
  const { target, min } = norm;

  const percentage = Math.min(100, Math.round((mclm / target) * 100));
  const delta = previousMclm === undefined ? null : mclm - previousMclm;

  let barColor = "bg-amber-500";
  if (mclm >= target) {
    barColor = "bg-emerald-600";
  } else if (mclm >= min) {
    barColor = "bg-primary-600";
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold font-fun text-2xl text-stone-900 sm:text-3xl">
            {mclm}
          </span>
          <span className="font-semibold text-stone-600 text-xs">
            MCLM (cible {level} : {target})
          </span>
          {delta !== null && (
            <span
              className={`ml-1 rounded px-1.5 py-0.5 font-bold text-xs ${
                delta > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : delta === 0
                    ? "bg-stone-100 text-stone-700"
                    : "bg-rose-100 text-rose-800"
              }`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>

        {wordsAttempted !== undefined && (
          <div className="flex flex-wrap items-center gap-2 text-stone-600 text-xs">
            <span>{wordsAttempted} mots lus</span>
            {errorsCount !== undefined && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    errorsCount > 0 ? "font-semibold text-rose-700" : ""
                  }
                >
                  {errorsCount} erreur{errorsCount > 1 ? "s" : ""}
                </span>
              </>
            )}
            {hesitationsCount !== undefined && hesitationsCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-amber-800">
                  {hesitationsCount} hésitation{hesitationsCount > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-stone-200/80">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(5, percentage)}%` }}
        />
      </div>
    </div>
  );
};
