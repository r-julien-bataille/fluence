import { tokenizeFrenchText } from "../lib/utils";
import type { ExerciseText } from "./db";
import { db } from "./db";

export const INITIAL_TEXTS: ExerciseText[] = [
  {
    comprehensionQuestions: [
      {
        answer:
          "Ils ont vu une lueur mystérieuse dans la nuit et voulaient comprendre d'où elle venait.",
        question: "Pourquoi Lucas et Juliette sont-ils montés au phare ?",
      },
      {
        answer: "Un ornithologue venu observer les oiseaux nocturnes.",
        question: "Qui était réellement la silhouette dans le phare ?",
      },
    ],
    content: `Au sommet de la falaise battue par les vagues, le vieux phare ne s'allumait plus depuis des années. Pourtant, hier soir, Lucas et sa sœur Juliette ont aperçu une lueur mystérieuse tournoyant dans l'obscurité. Munis de leurs lampes de poche et d'un carnet d'enquêteur, les deux enfants ont gravi le sentier rocailleux. Le vent soufflait fort en faisant claquer les volets rouillés de la bâtisse. À l'intérieur, une silhouette sombre examinait une ancienne carte marine posée sur une table en bois massif. Juliette retint son souffle tandis que Lucas actionna discrètement l'interrupteur. La lumière dévoila un ornithologue passionné qui observait les oiseaux nocturnes nichant dans la vieille tour. Rassurés et fascinés, les jeunes détectives ont écouté avec attention les récits de ce savant bienveillant.`,
    createdAt: 1_710_000_000_000,
    id: "cm2-texte-1",
    isCustom: false,
    level: "CM2",
    targetMclm: 115,
    theme: "Mystère & Détectives",
    title: "L'énigme du phare abandonné",
    tokens: [],
    wordCount: 0,
  },
  {
    comprehensionQuestions: [
      {
        answer: "Il rêve d'observer les loups gris du Grand Nord.",
        question: "Quel animal Antoine rêve-t-il d'observer ?",
      },
      {
        answer:
          "Il lève la tête, renifle l'air et les regarde paisiblement sans agressivité.",
        question:
          "Que fait le loup dominant quand il aperçoit Antoine et son grand-père ?",
      },
    ],
    content: `Chaque hiver, lorsque les premières neiges recouvrent les grands sapins du Grand Nord, les loups gris descendent vers la vallée glacée. Antoine rêvait depuis toujours d'observer ces animaux légendaires dans leur milieu naturel. Accompagné de son grand-père, un trappeur expérimenté, il avançait silencieusement avec des raquettes aux pieds. Le froid mordait ses joues, mais la beauté du paysage immaculé lui faisait oublier la fatigue du voyage. Soudain, au détour d'un ruisseau gelé, une meute majestueuse apparut sous la lumière dorée du crépuscule. Le loup dominant leva la tête, renifla l'air vif et fixa les deux promeneurs sans aucune agressivité. Ce moment suspendu d'une rare intensité resta gravé à jamais dans la mémoire du jeune garçon.`,
    createdAt: 1_710_000_001_000,
    id: "cm2-texte-2",
    isCustom: false,
    level: "CM2",
    targetMclm: 115,
    theme: "Nature & Expédition",
    title: "Le secret de la forêt boréale",
    tokens: [],
    wordCount: 0,
  },
  {
    comprehensionQuestions: [
      {
        answer: "Chercher de l'eau et ramasser des cailloux multicolores.",
        question: "Quelle est la mission du robot sur la planète rouge ?",
      },
    ],
    content: `Sur la planète rouge, le petit robot Explorateur roule doucement sur le sable fin. Sa mission principale est de chercher des traces d'eau et de récolter de minuscules pierres multicolores. Soudain, ses caméras détectent une forme brillante cachée au creux d'un cratère géant. Avec son bras articulé ultra précis, il soulève délicatement un étrange caillou transparent qui scintille sous les deux soleils. Immédiatement, il envoie les photos à la Terre avec enthousiasme.`,
    createdAt: 1_710_000_002_000,
    id: "cm1-texte-1",
    isCustom: false,
    level: "CM1",
    targetMclm: 100,
    theme: "Science-fiction",
    title: "Le robot de l'espace",
    tokens: [],
    wordCount: 0,
  },
  {
    comprehensionQuestions: [
      {
        answer: "Des glands dorés et des noisettes fraîches.",
        question: "Que cache Noisette dans les trous ?",
      },
    ],
    content: `Dans le vieux chêne du jardin, Noisette l'écureuil cache précieusement ses provisions pour la saison froide. Il grimpe le long du tronc avec une grande agilité. Chaque jour, il creuse un petit trou au pied des arbres pour y déposer des glands dorés et des noisettes fraîches. Parfois, il oublie où se trouvent ses cachettes, mais au printemps suivant, de jeunes arbres commencent à pousser.`,
    createdAt: 1_710_000_003_000,
    id: "ce2-texte-1",
    isCustom: false,
    level: "CE2",
    targetMclm: 85,
    theme: "Animaux",
    title: "Le trésor de l'écureuil",
    tokens: [],
    wordCount: 0,
  },
  {
    comprehensionQuestions: [
      {
        answer: "Préparer du chocolat chaud et tricoter des écharpes en laine.",
        question: "Que préfère faire Flamme au lieu de cracher du feu ?",
      },
    ],
    content:
      "Flamme est un petit dragon qui a toujours froid. Au lieu de cracher du feu terrifiant comme ses grands frères, il préfère préparer du chocolat chaud et tricoter des écharpes en laine pour ses amis les lapins de la forêt. Tout le village adore sa gentillesse.",
    createdAt: 1_710_000_004_000,
    id: "ce1-texte-1",
    isCustom: false,
    level: "CE1",
    targetMclm: 60,
    theme: "Contes",
    title: "Le dragon frileux",
    tokens: [],
    wordCount: 0,
  },
];

// Enrichir avec tokens et wordCount
for (const text of INITIAL_TEXTS) {
  const tokenList = tokenizeFrenchText(text.content);
  text.tokens = tokenList.map((t) => t.clean);
  text.wordCount = tokenList.length;
}

export const seedDatabaseIfEmpty = async () => {
  try {
    const count = await db.texts.count();
    if (count === 0) {
      await db.texts.bulkPut(INITIAL_TEXTS);
    }
  } catch (error) {
    console.warn(
      "Échec vérification initiale Dexie, tentative de réconciliation :",
      error
    );
    try {
      await db.texts.bulkPut(INITIAL_TEXTS);
    } catch (retryError) {
      console.error("Erreur critique seed Dexie :", retryError);
    }
  }
};
