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
          className={`focus-visible:ring-primary-500 flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden ${
            isSelected
              ? "border-primary-500 bg-primary-50/70"
              : "bg-paper hover:bg-cream border-stone-200"
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
            <span className="text-xs font-semibold text-stone-900">
              {theme.name}
            </span>
          </div>

          {isSelected && (
            <Check
              aria-hidden="true"
              className="text-primary-600 h-4 w-4 shrink-0"
            />
          )}
        </button>
      );
    })}
  </div>
);
