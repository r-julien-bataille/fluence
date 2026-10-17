import type React from "react";

import { APP_VERSION } from "@/lib/version";

const SOURCES = [
  {
    href: "https://www1.ac-grenoble.fr/cognisciences-121593",
    label: "Protocole ELFE (Cogni-Sciences)",
  },
  {
    href: "https://eduscol.education.gouv.fr/",
    label: "Repères Éduscol",
  },
] as const;

export const SourcesFooter: React.FC = () => (
  <footer className="border-stone-200/80 border-t bg-paper/60 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-stone-600 text-xs">
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {SOURCES.map(({ href, label }) => (
          <a
            className="text-stone-600 underline decoration-stone-300 underline-offset-2 transition-colors hover:text-stone-900"
            href={href}
            key={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {label}
          </a>
        ))}
      </div>
      <span className="font-mono text-[11px] text-stone-600">
        Fluence v{APP_VERSION}
      </span>
    </div>
  </footer>
);
