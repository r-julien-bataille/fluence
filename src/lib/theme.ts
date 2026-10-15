export type ThemeId = "ocean" | "sauge" | "indigo" | "corail";

export interface ThemeDefinition {
  accentHex: string;
  badge: string;
  contrastRatio: string;
  description: string;
  id: ThemeId;
  name: string;
  pedagogicalBenefit: string;
  primaryHex: string;
  secondaryHex: string;
  tagline: string;
}

export const THEMES: readonly ThemeDefinition[] = [
  {
    accentHex: "#60A5FA",
    badge: "Ludo-éducatif",
    contrastRatio: "5.5:1",
    description:
      "Joyeux, moderne et dynamique. Familier des outils ludo-éducatifs pour stimuler l'envie de lire.",
    id: "ocean",
    name: "Bleu Océan Lumineux",
    pedagogicalBenefit:
      "Favorise l'enthousiasme et l'engagement spontané dans l'activité de lecture.",
    primaryHex: "#2563EB",
    secondaryHex: "#1D4ED8",
    tagline: "Dynamique & Joyeux",
  },
  {
    accentHex: "#2DD4BF",
    badge: "Montessori",
    contrastRatio: "4.7:1",
    description:
      "Naturel, bienveillant et apaisant. Inspiré des pédagogies actives et du matériel Montessori.",
    id: "sauge",
    name: "Vert Menthe Sauge Écolier",
    pedagogicalBenefit:
      "Apaise l'anxiété de la lecture chronométrée et favorise une concentration sereine.",
    primaryHex: "#0D9488",
    secondaryHex: "#059669",
    tagline: "Naturel & Bienveillant",
  },
  {
    accentHex: "#818CF8",
    badge: "Attention",
    contrastRatio: "6.3:1",
    description:
      "Élégant et structurant. Rappelle l'encre violette d'écolier revisitée pour focaliser le regard.",
    id: "indigo",
    name: "Indigo / Bleuet Doux",
    pedagogicalBenefit:
      "Canalise l'attention visuelle et facilite le repérage fin des graphèmes complexes.",
    primaryHex: "#4F46E5",
    secondaryHex: "#4338CA",
    tagline: "Focalisation & Encre",
  },
  {
    accentHex: "#FB923C",
    badge: "Expression",
    contrastRatio: "5.7:1",
    description:
      "Chaleureux, expressif et ultra-dynamisant pour encourager la projection et la prise de parole.",
    id: "corail",
    name: "Corail / Terre Cuite Solaire",
    pedagogicalBenefit:
      "Donne de l'énergie à la voix et encourage l'intonation expressive lors des défis.",
    primaryHex: "#EA580C",
    secondaryHex: "#C2410C",
    tagline: "Chaleureux & Expressif",
  },
] as const;

export const DEFAULT_THEME_ID: ThemeId = "ocean";
export const STORAGE_KEY_THEME = "FLUENCE_THEME";

export function getStoredTheme(): ThemeId {
  try {
    const val = localStorage.getItem(STORAGE_KEY_THEME);
    if (
      val === "ocean" ||
      val === "sauge" ||
      val === "indigo" ||
      val === "corail"
    ) {
      return val;
    }
  } catch {
    // Ignorer si localStorage n'est pas accessible
  }
  return DEFAULT_THEME_ID;
}

export function applyTheme(themeId: ThemeId): void {
  try {
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem(STORAGE_KEY_THEME, themeId);
    const themeDef = THEMES.find((t) => t.id === themeId);
    if (themeDef) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", themeDef.primaryHex);
      }
    }
  } catch {
    // Ignorer si localStorage n'est pas accessible
  }
}
