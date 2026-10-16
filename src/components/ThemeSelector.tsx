import { Check } from "lucide-react";
import type React from "react";

import { THEMES, type ThemeId } from "@/lib/theme";

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme,
}) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {THEMES.map((theme) => {
      const isSelected = theme.id === currentTheme;
      return (
        <button
          aria-pressed={isSelected}
          className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
            isSelected
              ? "border-primary-500 bg-primary-50/70 shadow-sm ring-2 ring-primary-500/20"
              : "border-stone-200 bg-paper hover:border-stone-300 hover:bg-cream"
          }`}
          key={theme.id}
          onClick={() => onSelectTheme(theme.id)}
          title={`${theme.name} : ${theme.pedagogicalBenefit}`}
          type="button"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="h-7 w-7 shrink-0 rounded-xl shadow-xs ring-2 ring-white"
                style={{
                  background: `linear-gradient(135deg, ${theme.primaryHex}, ${theme.secondaryHex})`,
                }}
              />
              <div>
                <span className="block font-bold font-fun text-sm text-stone-900">
                  {theme.name}
                </span>
                <p className="font-medium font-sans text-[11px] text-stone-600">
                  {theme.tagline}
                </p>
              </div>
            </div>
            {isSelected && (
              <div
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-xs"
              >
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            )}
          </div>

          <p className="mt-3 text-stone-600 text-xs leading-relaxed">
            {theme.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-stone-200/60 border-t pt-2.5">
            <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-[10px] text-stone-600">
              {theme.badge}
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold font-mono text-[10px] text-emerald-800">
              WCAG AA : {theme.contrastRatio}
            </span>
          </div>
        </button>
      );
    })}
  </div>
);
