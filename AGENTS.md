# AGENTS.md

## Project Overview

**Fluence** is a client-side React web application (in French) for evaluating and training reading fluency for primary school students (**CE1 to CM2**, ages 7–11), following the official **ELFE (Laboratoire Cogni-Sciences)** and **Éduscol** protocols.

Each training session follows a 3-step pedagogical workflow managed by `src/components/SessionRunner.tsx`:

1. **Étape 1 (`Step1Reading.tsx`)**: 60-second timed first reading with audio recording (`useAudioRecorder.ts`), multimodal transcription via Gemini (`src/lib/gemini/transcribe.ts`), and Levenshtein alignment (`src/lib/alignment.ts`) to compute **MCLM** (_Mots Correctement Lus par Minute_).
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
pnpm typecheck   # Runs `tsc -b` (TypeScript 7 native Go typechecker)
pnpm build       # Runs `tsc -b && vite build` (Rolldown production bundle)
pnpm dev         # Starts local Vite dev server
pnpm preview     # Serves the production build from dist/
```

---

## Coding Conventions & Best Practices

1. **Performance & Bundle Splitting**:
   - Keep the initial entry bundle minimal. Secondary views (`Step1Reading`, `Step2Remediation`, `Step3Challenge`, `StepSummary`, `StoryGeneratorModal`, `SettingsModal`, `HistoryDrawer`) must remain lazy-loaded with `React.lazy()` and `<Suspense>`.
2. **Accessibility (WCAG AA) & Dyslexia Support**:
   - Maintain a contrast ratio of at least `4.5:1` for body/badge text (use `text-stone-600` or darker on `bg-paper`/`bg-cream` backgrounds; avoid `text-stone-400` on text).
   - Provide explicit `aria-label` attributes on icon-only buttons.
   - Preserve support for the `mode-dyslexique` toggle (`Lexend` font, increased letter/word spacing, and syllable coloring in remediation).
3. **Language & Simplicity**:
   - All user-facing UI strings and pedagogical prompts must be in **French**.
   - Prefer minimal, direct fixes at the root cause over defensive workarounds or unnecessary abstractions.
4. **Workspace Skills (`.agents/skills/`)**:
   - Consult `.agents/skills/pnpm/SKILL.md` for package management, strict peer dependency, and allowBuilds rules.
   - Consult `.agents/skills/vite/SKILL.md` for Vite 8 / Rolldown configuration changes.
   - Consult `.agents/skills/tsdown/SKILL.md` if extracting or bundling standalone TypeScript libraries.

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm exec ultracite fix`
- **Check for issues**: `pnpm exec ultracite check`
- **Diagnose setup**: `pnpm exec ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome will catch most mechanical issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm exec ultracite fix` before committing to ensure compliance.
