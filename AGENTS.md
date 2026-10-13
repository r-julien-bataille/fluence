# AGENTS.md

## Project Overview

**Fluence** is a client-side React web application (in French) for evaluating and training reading fluency for primary school students (**CE1 to CM2**, ages 7–11), following the official **ELFE (Laboratoire Cogni-Sciences)** and **Éduscol** protocols.

Each training session follows a 3-step pedagogical workflow managed by `src/components/SessionRunner.tsx`:
1. **Étape 1 (`Step1Reading.tsx`)**: 60-second timed first reading with audio recording (`useAudioRecorder.ts`), multimodal transcription via Gemini (`src/lib/gemini/transcribe.ts`), and Levenshtein alignment (`src/lib/alignment.ts`) to compute **MCLM** (*Mots Correctement Lus par Minute*).
2. **Étape 2 (`Step2Remediation.tsx`)**: Untimed remediation focused on misread/hesitated words with Web Speech API synthesis (`fr-FR`).
3. **Étape 3 (`Step3Challenge.tsx`)**: 60-second "Défi Record" second reading to measure progress and celebrate improvements (`StepSummary.tsx`).

---

## Tech Stack & Tooling Contracts

- **TypeScript 7 (`^7.0.2`, Native Go Compiler / "Corsa")**:
  - Uses solution-style project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`).
  - Do **not** use options removed in TypeScript 7 (`baseUrl`, `target: "es5"`, `moduleResolution: "node10"`). Path aliases in `tsconfig.app.json` must use relative prefixes (`"@/*": ["./src/*"]`), and `rootDir` / `types` must be declared explicitly.
  - Delete stale `.tsbuildinfo` files (`node_modules/.tmp/*.tsbuildinfo`) if switching compiler versions.
- **Vite 8 (`^8.3.4`, Rolldown + Oxc)**:
  - Uses **Rolldown** for bundling and **Oxc** for TypeScript/JSX transformation and minification (`@vitejs/plugin-react` v6).
  - In `vite.config.ts`, use `import.meta.dirname` (not `__dirname`) and `build.rolldownOptions.output.codeSplitting.groups` (do **not** use the removed `rollupOptions.output.manualChunks` object syntax).
- **UI & Styling**:
  - **React 19** (`^19.3.0`), **Tailwind CSS v4** (`@tailwindcss/vite`), **Lucide React** icons.
- **Local Storage & Database**:
  - **Dexie.js v4** (IndexedDB) in `src/db/db.ts` stores custom texts (`texts`) and completed reading sessions (`sessions`).
  - **BYOK (Bring Your Own Key)**: The user's Google Gemini API key is stored in `localStorage` (`fluence_gemini_api_key`) for serverless local execution.
- **Google Gemini SDK (`@google/genai`)**:
  - Uses `gemini-3-flash-preview` in `src/lib/gemini/transcribe.ts` (audio transcription) and `src/lib/gemini/generator.ts` (custom story generation with structured JSON schema).
  - Always import `@google/genai` **dynamically** via `getGenAIClient()` in `src/lib/gemini/client.ts` (`await import('@google/genai')`) so the SDK chunk is loaded on demand and never blocks initial rendering.

---

## Commands & Verification

Always verify changes using the following commands before finishing a task:

```bash
npm run typecheck   # Runs `tsc -b` (TypeScript 7 native Go typechecker)
npm run build       # Runs `tsc -b && vite build` (Rolldown production bundle)
npm run dev         # Starts local Vite dev server
npm run preview     # Serves the production build from dist/
```

---

## Coding Conventions & Best Practices

1. **Performance & Bundle Splitting**:
   - Keep the initial entry bundle minimal. Secondary views (`Step1Reading`, `Step2Remediation`, `Step3Challenge`, `StepSummary`, `StoryGeneratorModal`, `SettingsModal`, `HistoryDrawer`) must remain lazy-loaded with `React.lazy()` and `<Suspense>`.
2. **Accessibility (WCAG AA) & Dyslexia Support**:
   - Maintain a contrast ratio of at least `4.5:1` for body/badge text (use `text-slate-600` or darker on white/light backgrounds; avoid `text-slate-400` on text).
   - Provide explicit `aria-label` attributes on icon-only buttons.
   - Preserve support for the `mode-dyslexique` toggle (`Lexend` font, increased letter/word spacing, and syllable coloring in remediation).
3. **Language & Simplicity**:
   - All user-facing UI strings and pedagogical prompts must be in **French**.
   - Prefer minimal, direct fixes at the root cause over defensive workarounds or unnecessary abstractions.
4. **Workspace Skills (`.agents/skills/`)**:
   - Consult `.agents/skills/vite/SKILL.md` for Vite 8 / Rolldown configuration changes.
   - Consult `.agents/skills/typescript-migration/SKILL.md` for TypeScript 7 compiler rules and diagnostics.
   - Consult `.agents/skills/tsdown/SKILL.md` if extracting or bundling standalone TypeScript libraries.
