import { ExternalLink } from "lucide-react";
import type React from "react";

import { APP_VERSION } from "@/lib/version";

const SOURCES = [
  {
    href: "https://www1.ac-grenoble.fr/cognisciences-121593",
    label: "ELFE – Laboratoire Cogni-Sciences",
  },
  {
    href: "https://eduscol.education.gouv.fr/",
    label: "Éduscol – Ministère de l’Éducation nationale",
  },
] as const;

export const SourcesFooter: React.FC = () => (
  <footer className="border-stone-200 border-t bg-paper px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-stone-600 text-xs">
    <p className="mb-2 font-semibold">
      Protocole de référence : ELFE (Évaluation de la Lecture en FluencE) et
      repères Éduscol. Application d’entraînement inspirée de ces protocoles,
      non officielle.
    </p>
    <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
      {SOURCES.map(({ href, label }) => (
        <li key={href}>
          <a
            className="inline-flex items-center gap-1 text-primary-700 underline hover:text-primary-900"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {label}
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
            <span className="sr-only">(s’ouvre dans un nouvel onglet)</span>
          </a>
        </li>
      ))}
      <li className="font-mono text-stone-600">Fluence v{APP_VERSION}</li>
    </ul>
  </footer>
);
