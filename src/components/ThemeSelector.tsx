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
  <div className="grid grid-cols-2 gap-2.5">
    {THEMES.map((theme) => {
      const isSelected = theme.id === currentTheme;
      return (
        <button
          aria-pressed={isSelected}
          className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
            isSelected
              ? "border-primary-500 bg-primary-50/70"
              : "border-stone-200 bg-paper hover:bg-cream"
          }`}
          key={theme.id}
          onClick={() => onSelectTheme(theme.id)}
          type="button"
        >
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-5 w-5 shrink-0 rounded-full ring-1 ring-stone-900/10"
              style={{
                backgroundColor: theme.primaryHex,
              }}
            />
            <span className="font-semibold text-stone-900 text-xs">
              {theme.name}
            </span>
          </div>

          {isSelected && (
            <Check
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-primary-600"
            />
          )}
        </button>
      );
    })}
  </div>
);
