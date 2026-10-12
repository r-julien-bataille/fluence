import { db, ExerciseText } from './db';
import { tokenizeFrenchText } from '../lib/utils';

export const INITIAL_TEXTS: ExerciseText[] = [
  {
    id: 'cm2-texte-1',
    title: "L'énigme du phare abandonné",
    level: 'CM2',
    theme: 'Mystère & Détectives',
    content: `Au sommet de la falaise battue par les vagues, le vieux phare ne s'allumait plus depuis des années. Pourtant, hier soir, Lucas et sa sœur Juliette ont aperçu une lueur mystérieuse tournoyant dans l'obscurité. Munis de leurs lampes de poche et d'un carnet d'enquêteur, les deux enfants ont gravi le sentier rocailleux. Le vent soufflait fort en faisant claquer les volets rouillés de la bâtisse. À l'intérieur, une silhouette sombre examinait une ancienne carte marine posée sur une table en bois massif. Juliette retint son souffle tandis que Lucas actionna discrètement l'interrupteur. La lumière dévoila un ornithologue passionné qui observait les oiseaux nocturnes nichant dans la vieille tour. Rassurés et fascinés, les jeunes détectives ont écouté avec attention les récits de ce savant bienveillant.`,
    tokens: [],
    targetMclm: 115,
    wordCount: 0,
    comprehensionQuestions: [
      {
        question: "Pourquoi Lucas et Juliette sont-ils montés au phare ?",
        answer: "Ils ont vu une lueur mystérieuse dans la nuit et voulaient comprendre d'où elle venait."
      },
      {
        question: "Qui était réellement la silhouette dans le phare ?",
        answer: "Un ornithologue venu observer les oiseaux nocturnes."
      }
    ],
    isCustom: false,
    createdAt: 1710000000000,
  },
  {
    id: 'cm2-texte-2',
    title: "Le secret de la forêt boréale",
    level: 'CM2',
    theme: 'Nature & Expédition',
    content: `Chaque hiver, lorsque les premières neiges recouvrent les grands sapins du Grand Nord, les loups gris descendent vers la vallée glacée. Antoine rêvait depuis toujours d'observer ces animaux légendaires dans leur milieu naturel. Accompagné de son grand-père, un trappeur expérimenté, il avançait silencieusement avec des raquettes aux pieds. Le froid mordait ses joues, mais la beauté du paysage immaculé lui faisait oublier la fatigue du voyage. Soudain, au détour d'un ruisseau gelé, une meute majestueuse apparut sous la lumière dorée du crépuscule. Le loup dominant leva la tête, renifla l'air vif et fixa les deux promeneurs sans aucune agressivité. Ce moment suspendu d'une rare intensité resta gravé à jamais dans la mémoire du jeune garçon.`,
    tokens: [],
    targetMclm: 115,
    wordCount: 0,
    comprehensionQuestions: [
      {
        question: "Quel animal Antoine rêve-t-il d'observer ?",
        answer: "Il rêve d'observer les loups gris du Grand Nord."
      },
      {
        question: "Que fait le loup dominant quand il aperçoit Antoine et son grand-père ?",
        answer: "Il lève la tête, renifle l'air et les regarde paisiblement sans agressivité."
      }
    ],
    isCustom: false,
    createdAt: 1710000001000,
  },
  {
    id: 'cm1-texte-1',
    title: "Le robot de l'espace",
    level: 'CM1',
    theme: 'Science-fiction',
    content: `Sur la planète rouge, le petit robot Explorateur roule doucement sur le sable fin. Sa mission principale est de chercher des traces d'eau et de récolter de minuscules pierres multicolores. Soudain, ses caméras détectent une forme brillante cachée au creux d'un cratère géant. Avec son bras articulé ultra précis, il soulève délicatement un étrange caillou transparent qui scintille sous les deux soleils. Immédiatement, il envoie les photos à la Terre avec enthousiasme.`,
    tokens: [],
    targetMclm: 100,
    wordCount: 0,
    comprehensionQuestions: [
      {
        question: "Quelle est la mission du robot sur la planète rouge ?",
        answer: "Chercher de l'eau et ramasser des cailloux multicolores."
      }
    ],
    isCustom: false,
    createdAt: 1710000002000,
  },
  {
    id: 'ce2-texte-1',
    title: "Le trésor de l'écureuil",
    level: 'CE2',
    theme: 'Animaux',
    content: `Dans le vieux chêne du jardin, Noisette l'écureuil cache précieusement ses provisions pour la saison froide. Il grimpe le long du tronc avec une grande agilité. Chaque jour, il creuse un petit trou au pied des arbres pour y déposer des glands dorés et des noisettes fraîches. Parfois, il oublie où se trouvent ses cachettes, mais au printemps suivant, de jeunes arbres commencent à pousser.`,
    tokens: [],
    targetMclm: 85,
    wordCount: 0,
    comprehensionQuestions: [
      {
        question: "Que cache Noisette dans les trous ?",
        answer: "Des glands dorés et des noisettes fraîches."
      }
    ],
    isCustom: false,
    createdAt: 1710000003000,
  },
  {
    id: 'ce1-texte-1',
    title: "Le dragon frileux",
    level: 'CE1',
    theme: 'Contes',
    content: `Flamme est un petit dragon qui a toujours froid. Au lieu de cracher du feu terrifiant comme ses grands frères, il préfère préparer du chocolat chaud et tricoter des écharpes en laine pour ses amis les lapins de la forêt. Tout le village adore sa gentillesse.`,
    tokens: [],
    targetMclm: 60,
    wordCount: 0,
    comprehensionQuestions: [
      {
        question: "Que préfère faire Flamme au lieu de cracher du feu ?",
        answer: "Préparer du chocolat chaud et tricoter des écharpes en laine."
      }
    ],
    isCustom: false,
    createdAt: 1710000004000,
  }
];

// Enrichir avec tokens et wordCount
INITIAL_TEXTS.forEach((text) => {
  const tokenList = tokenizeFrenchText(text.content);
  text.tokens = tokenList.map((t) => t.clean);
  text.wordCount = tokenList.length;
});

export async function seedDatabaseIfEmpty() {
  try {
    const count = await db.texts.count();
    if (count === 0) {
      await db.texts.bulkPut(INITIAL_TEXTS);
    }
  } catch (err) {
    console.warn("Échec vérification initiale Dexie, tentative de réconciliation :", err);
    try {
      await db.texts.bulkPut(INITIAL_TEXTS);
    } catch (e) {
      console.error("Erreur critique seed Dexie :", e);
    }
  }
}
