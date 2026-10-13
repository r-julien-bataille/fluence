# Fluence — Entraînement et Évaluation de la Lecture (ELFE / Éduscol)

Application web SPA 100 % client-side dédiée à l'évaluation et l'entraînement à la **fluence de lecture** pour les enfants d'école primaire (du **CE1 au CM2**), basée sur les normes pédagogiques françaises officielles (**protocole ELFE / Cogni-Sciences / Éduscol**).

---

## 🎯 Cadre Pédagogique & Règles Métier (ELFE)

### Formule de référence : MCLM

$$\text{MCLM} = \text{Mots Correctement Lus en 60 secondes} = \text{Mots Totaux Lus en 60s} - \text{Erreurs}$$

### Repères officiels attendus (mots par minute)

- **CE1 :** 50 (début d'année) à 70 (fin d'année)
- **CE2 :** 75 à 90
- **CM1 :** 90 à 110
- **CM2 :** 110 à 130

### Taxonomie d'erreurs (ELFE / Cogni-Sciences)

- **Erreurs pénalisantes :**
  - **Substitution :** mot mal décodé ou remplacé par un autre.
  - **Omission :** mot sauté ou ligne oubliée (chaque mot non lu dans l'intervalle est décompté).
  - **Inversion :** inversion de deux mots consécutifs (1 erreur).
  - **Blocage / Hésitation :** pause ou hésitation $> 3$ secondes sur un mot.
- **Tolérances (non pénalisées) :**
  - **Autocorrection :** l'enfant hésite ou commence à mal lire mais se corrige seul avant de passer au mot suivant.
  - **Répétition :** répéter un mot déjà validé.
  - **Liaisons :** liaisons omises ou rajoutées tolérées dans le décodage brut.

---

## 🏗️ Architecture Technique (100 % Client-Side & BYOK)

- **Architecture :** Single Page Application 100 % front-end. Aucun serveur distant, aucune base de données centrale.
- **Persistance locale :** **IndexedDB** via **Dexie.js** avec hooks réactifs (`dexie-react-hooks`) et typage TypeScript complet.
- **Modèle BYOK (Bring Your Own Key) :** La clé Google AI Studio est stockée localement dans le `localStorage` de l'utilisateur sous la clé `GOOGLE_AI_KEY`.
- **Stack UI & Build :**
  - Bundler : **Vite** (React 19 + TypeScript strict).
  - Styles : **Tailwind CSS v4**, **Lucide React**.
  - Typographie : **Lexend** (recherche scientifique sur la fluence) et mode **Dys-confort**.
  - Confettis : **canvas-confetti**.
- **Intégration IA Google GenAI :**
  - SDK officiel : `@google/genai`
  - **STT :** `gemini-3.5-transcribe` configuré en mode `verbatim`, avec `languageCodes: ["fr-FR"]`, `timestamps: ["word"]` et injection du vocabulaire attendu dans `customVocabulary` (avec fallback multimodal fluide via `gemini-3.8-flash`).
  - **Génération & Compréhension :** `gemini-3.8-flash` avec JSON structuré pour générer des histoires adaptées au niveau (CE1, CE2, CM1, CM2) et des questions de compréhension.
- **Alignement phonétique & temporel :** Algorithme par programmation dynamique (Needleman-Wunsch pondéré avec distance de Levenshtein) borné à $T \le 60\,000\text{ ms}$.

---

## 🚀 Machine à États de la Séance (`SessionRunner`)

1. **Choix / Génération :**
   - Sélection du profil de l'élève (Hugo, Léa, etc.).
   - Sélection parmi des textes étalonnés (seeds pré-chargés) ou bouton **« Créer une nouvelle histoire »** avec génération par IA.
2. **Étape 1 — Première lecture chronométrée (60 secondes) :**
   - Présentation type fiche ELFE avec repères de mots cumulés par ligne en marge droite.
   - Compteur 60s géant et enregistrement audio en un clic (avec visualiseur de niveau micro Web Audio API).
   - Feedback visuel immédiat : coloration des mots (vert = juste, rouge = erreur/omission, orange = hésitation $>3$s) et score MCLM initial.
3. **Étape 2 — Remédiation & Répétition (Sans chronomètre) :**
   - Flashcards interactives pour les mots butés (`stumbledWords`).
   - Décomposition syllabique et synthèse vocale Web Speech API (`fr-FR`) pour écouter le modèle.
   - Questions de compréhension de l'histoire.
4. **Étape 3 — Défi Record (60 secondes) :**
   - Deuxième session chronométrée de 60s sur le même texte pour mesurer la progression immédiate.
5. **Écran Bilan & Victoire :**
   - Histogramme comparatif : _1ère lecture_ vs _Défi Record_ vs _Cible du niveau_.
   - Calcul du gain ($\Delta +X$ MCLM), confettis et sauvegarde automatique dans IndexedDB.

---

## 🛠️ Démarrage Rapide

### Prérequis

- Node.js $\ge 18$
- Clé API Google AI Studio (gratuite sur [aistudio.google.com](https://aistudio.google.com/app/apikey))

### Installation et lancement

```bash
# Cloner le projet et installer les dépendances
npm install

# Démarrer le serveur de développement Vite
npm run dev

# Tester la compilation de production
npm run build
```
