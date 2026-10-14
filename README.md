# Fluence — Entraînement et Évaluation de la Lecture

Application web SPA 100 % client-side dédiée à l'évaluation et l'entraînement à la **fluence de lecture** pour les enfants d'école primaire (du **CE1 au CM2**), basée sur les normes pédagogiques françaises officielles (**protocole ELFE / Cogni-Sciences / Éduscol**).


## Démarrage Rapide

### Prérequis

- Node.js $\ge 22.12$ (requis par Vite 8)
- **pnpm** 11 (`corepack enable`)
- Clé API Google AI Studio (gratuite sur [aistudio.google.com](https://aistudio.google.com/app/apikey))

### Installation et lancement

```bash
# Installer les dépendances
pnpm install

# Démarrer le serveur de développement Vite
pnpm dev

# Vérifier les types (TypeScript 7)
pnpm typecheck

# Lint et formatage (Ultracite / Biome)
pnpm check
pnpm fix

# Tester la compilation de production, puis la prévisualiser
pnpm build
pnpm preview
```


## Cadre Pédagogique & Règles Métier (ELFE)

### Formule de référence : MCLM

$$\text{MCLM} = \text{Mots Correctement Lus en 60 secondes} = \text{Mots Totaux Lus en 60s} - \text{Erreurs}$$

### Repères officiels attendus (mots par minute)

- **CE1 :** 50 (début d'année) à 70 (fin d'année)
- **CE2 :** 75 à 90
- **CM1 :** 90 à 110
- **CM2 :** 110 à 130

### Taxonomie d'erreurs

- **Erreurs pénalisantes :**
  - **Substitution :** mot mal décodé ou remplacé par un autre.
  - **Omission :** mot sauté ou ligne oubliée (chaque mot non lu dans l'intervalle est décompté).
  - **Inversion :** inversion de deux mots consécutifs (1 erreur).
  - **Blocage / Hésitation :** pause ou hésitation > 3 secondes sur un mot.
- **Tolérances (non pénalisées) :**
  - **Autocorrection :** l'enfant hésite ou commence à mal lire mais se corrige seul avant de passer au mot suivant.
  - **Répétition :** répéter un mot déjà validé.
  - **Liaisons :** liaisons omises ou rajoutées tolérées dans le décodage brut.



## Architecture Technique

- **Architecture :** Single Page Application 100 % front-end. Aucun serveur distant, aucune base de données centrale.
- **Persistance locale :** **IndexedDB** via **Dexie.js** avec hooks réactifs (`dexie-react-hooks`) et typage TypeScript complet.
- **Modèle BYOK (Bring Your Own Key) :** La clé Google AI Studio est stockée localement dans le `localStorage` de l'utilisateur sous la clé `GOOGLE_AI_KEY`.
- **Stack UI & Build :**
  - Framework : **React 19**.
  - Langage : **TypeScript 7**.
  - Bundler : **Vite 8** (Rolldown + Oxc), **Lucide React**.
  - Typographie : **Lexend** (recherche scientifique sur la fluence) et mode **Dys-confort**.
  - Confettis : **canvas-confetti**.
  - Qualité de code : **Ultracite** (Biome) pour le lint et le formatage.
  - Gestionnaire de paquets : **pnpm**.
- **Intégration IA Google GenAI :**
  - SDK officiel : `@google/genai`
  - **STT :** `gemini-3.5-transcribe` configuré en mode `verbatim`, avec `languageCodes: ["fr-FR"]`, `timestamps: ["word"]` et injection du vocabulaire attendu dans `customVocabulary` (avec fallback multimodal fluide via `gemini-3.8-flash`).
  - **Génération & Compréhension :** `gemini-3.8-flash` avec JSON structuré pour générer des histoires adaptées au niveau (CE1, CE2, CM1, CM2) et des questions de compréhension.
- **Alignement phonétique & temporel :** Algorithme par programmation dynamique (Needleman-Wunsch pondéré avec distance de Levenshtein) borné à $T \le 60\,000\text{ ms}$.

