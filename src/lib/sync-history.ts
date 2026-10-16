import type {
  ExerciseText,
  FluencyAttempt,
  FluencyLevel,
  FluencySession,
} from "@/db/db";
import { db } from "@/db/db";
import { INITIAL_TEXTS } from "@/db/seeds";
import { tokenizeFrenchText } from "@/lib/utils";

const FORMAT_TAG = "fluence-sync" as const;
const FORMAT_VERSION = 1 as const;
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]+/gi;
const EDGE_DASH_REGEX = /^-+|-+$/g;

const STATUS_TO_CODE = {
  correct: 0,
  error: 1,
  hesitation: 2,
  unreached: 3,
} as const;

const CODE_TO_STATUS = ["correct", "error", "hesitation", "unreached"] as const;

const ERROR_TYPE_TO_CODE = {
  hesitation: 3,
  inversion: 2,
  omission: 1,
  substitution: 0,
} as const;

const CODE_TO_ERROR_TYPE = [
  "substitution",
  "omission",
  "inversion",
  "hesitation",
] as const;

/**
 * Tuple compact pour un mot annoté :
 * [word, statusCode (0..3), expectedIndex?, spoken?, timestampMs?]
 */
export type CompactAnnotatedWord = [
  word: string,
  statusCode: 0 | 1 | 2 | 3,
  expectedIndex?: number,
  spoken?: string,
  timestampMs?: number,
];

/**
 * Tuple compact pour un détail d'erreur :
 * [expectedWord, typeCode (0..3), spokenWord?, timestampOffsetMs?]
 */
export type CompactErrorDetail = [
  expectedWord: string,
  typeCode: 0 | 1 | 2 | 3,
  spokenWord?: string,
  timestampOffsetMs?: number,
];

/**
 * Tentative de lecture sérialisée sans Blob/URL audio éphémères.
 */
export interface CompactAttempt {
  /** annotatedWords sous forme de tuples compacts */
  aw?: CompactAnnotatedWord[];
  /** durationSeconds */
  d: number;
  /** errorsCount */
  e: number;
  /** errorDetails sous forme de tuples compacts */
  ed: CompactErrorDetail[];
  /** lastWordReachedIndex */
  l: number;
  /** mclm */
  m: number;
  /** stumbledWords */
  sw: string[];
  /** timestamp */
  t: number;
  /** transcript */
  tr?: string;
  /** wordsAttempted */
  w: number;
}

/**
 * Séance sérialisée de manière compacte et déterministe.
 */
export interface CompactSession {
  /** date */
  d: number;
  /** Empreinte déterministe (fingerprint) pour la déduplication inter-appareils */
  fp: string;
  /** id d'origine */
  id: string;
  /** progressionDelta */
  pd?: number;
  /** step1 */
  s1: CompactAttempt;
  /** step3 */
  s3?: CompactAttempt;
  /** studentName */
  sn: string;
  /** textId */
  tid: string;
}

/**
 * Texte personnalisé embarqué (sans le tableau `tokens` qui est recalculé à l'import).
 */
export interface CompactCustomText {
  /** createdAt */
  ca: number;
  /** content */
  co: string;
  /** comprehensionQuestions */
  cq: { a: string; q: string }[];
  /** id */
  id: string;
  /** level */
  lv: FluencyLevel;
  /** theme */
  th: string;
  /** title */
  ti: string;
  /** targetMclm */
  tm: number;
}

export interface StudentSyncPayload {
  /** Date d'export (timestamp ms) */
  exportedAt: number;
  /** Identifiant de format */
  format: typeof FORMAT_TAG;
  /** Séances compactées */
  sessions: CompactSession[];
  /** Profil de l'élève exporté (si export ciblé sur un élève) */
  student?: {
    level: FluencyLevel;
    name: string;
  };
  /** Textes sur mesure référencés par les séances */
  texts: CompactCustomText[];
  /** Version du schéma */
  version: typeof FORMAT_VERSION;
}

export interface ImportSyncResult {
  addedSessions: number;
  addedTexts: number;
  duplicateSkippedSessions: number;
  studentProfile?: {
    level: FluencyLevel;
    name: string;
  };
  totalSessionsInFile: number;
  updatedSessions: number;
}

/**
 * Normalise le prénom d'un élève pour les comparaisons et empreintes.
 */
export function normalizeStudentName(name: string): string {
  return name.trim().toLocaleLowerCase("fr-FR");
}

/**
 * Calcule une empreinte déterministe (FNV-1a 32-bit hex + clés métier)
 * pour identifier de manière unique une séance même si son ID a changé.
 */
export function computeSessionFingerprint(session: FluencySession): string {
  const normalizedStudent = normalizeStudentName(session.studentName);
  const s1 = session.step1;
  const s3 = session.step3;

  // Si step1.timestamp est présent, il identifie le moment précis de la 1ère lecture.
  // Sinon on combine date + métriques clés.
  const rawKey = [
    normalizedStudent,
    session.textId.trim(),
    s1.timestamp || session.date,
    s1.mclm,
    s1.wordsAttempted,
    s1.errorsCount,
    s3 ? `${s3.mclm}:${s3.wordsAttempted}:${s3.errorsCount}` : "no-s3",
  ].join("|");

  let hash = 5381;
  for (let i = 0; i < rawKey.length; i += 1) {
    hash = (hash * 33 + rawKey.charCodeAt(i)) % 4_294_967_291;
  }
  const hex = hash.toString(16).padStart(8, "0");
  return `fp-${normalizedStudent}-${session.textId}-${s1.timestamp || session.date}-${hex}`;
}

/**
 * Clé de correspondance souple (même élève, même texte, même prise step1)
 * permettant de fusionner une séance partielle avec une séance complétée (avec step3).
 */
function computeSessionIdentityKey(session: FluencySession): string {
  const normalizedStudent = normalizeStudentName(session.studentName);
  const primaryTimestamp = session.step1.timestamp || session.date;
  return `${normalizedStudent}::${session.textId.trim()}::${primaryTimestamp}::${session.step1.mclm}::${session.step1.wordsAttempted}`;
}

function serializeAttempt(attempt: FluencyAttempt): CompactAttempt {
  const compact: CompactAttempt = {
    d: attempt.durationSeconds,
    e: attempt.errorsCount,
    ed: attempt.errorDetails.map((err) => {
      const tuple: CompactErrorDetail = [
        err.expectedWord,
        ERROR_TYPE_TO_CODE[err.type] ?? 0,
      ];
      if (err.spokenWord !== undefined || err.timestampOffsetMs !== undefined) {
        tuple.push(err.spokenWord);
      }
      if (err.timestampOffsetMs !== undefined) {
        tuple.push(err.timestampOffsetMs);
      }
      return tuple;
    }),
    l: attempt.lastWordReachedIndex,
    m: attempt.mclm,
    sw: attempt.stumbledWords,
    t: attempt.timestamp,
    w: attempt.wordsAttempted,
  };

  if (attempt.transcript) {
    compact.tr = attempt.transcript;
  }

  if (attempt.annotatedWords && attempt.annotatedWords.length > 0) {
    compact.aw = attempt.annotatedWords.map((w) => {
      const tuple: CompactAnnotatedWord = [
        w.word,
        STATUS_TO_CODE[w.status] ?? 0,
      ];
      if (
        w.expectedIndex !== undefined ||
        w.spoken !== undefined ||
        w.timestampMs !== undefined
      ) {
        tuple.push(w.expectedIndex);
      }
      if (w.spoken !== undefined || w.timestampMs !== undefined) {
        tuple.push(w.spoken);
      }
      if (w.timestampMs !== undefined) {
        tuple.push(w.timestampMs);
      }
      return tuple;
    });
  }

  return compact;
}

function deserializeAttempt(compact: CompactAttempt): FluencyAttempt {
  const attempt: FluencyAttempt = {
    durationSeconds: Number(compact.d) || 60,
    errorDetails: Array.isArray(compact.ed)
      ? compact.ed.map((tuple) => ({
          expectedWord: String(tuple[0] ?? ""),
          spokenWord: tuple[2] === undefined ? undefined : String(tuple[2]),
          timestampOffsetMs:
            tuple[3] === undefined ? undefined : Number(tuple[3]),
          type: CODE_TO_ERROR_TYPE[tuple[1]] ?? "substitution",
        }))
      : [],
    errorsCount: Number(compact.e) || 0,
    lastWordReachedIndex: Number(compact.l) || 0,
    mclm: Number(compact.m) || 0,
    stumbledWords: Array.isArray(compact.sw) ? compact.sw.map(String) : [],
    timestamp: Number(compact.t) || Date.now(),
    wordsAttempted: Number(compact.w) || 0,
  };

  if (compact.tr) {
    attempt.transcript = String(compact.tr);
  }

  if (Array.isArray(compact.aw) && compact.aw.length > 0) {
    attempt.annotatedWords = compact.aw.map((tuple) => ({
      expectedIndex: tuple[2] === undefined ? undefined : Number(tuple[2]),
      spoken: tuple[3] === undefined ? undefined : String(tuple[3]),
      status: CODE_TO_STATUS[tuple[1]] ?? "correct",
      timestampMs: tuple[4] === undefined ? undefined : Number(tuple[4]),
      word: String(tuple[0] ?? ""),
    }));
  }

  return attempt;
}

function serializeSession(session: FluencySession): CompactSession {
  const compact: CompactSession = {
    d: session.date,
    fp: computeSessionFingerprint(session),
    id: session.id,
    s1: serializeAttempt(session.step1),
    sn: session.studentName.trim(),
    tid: session.textId,
  };

  if (session.progressionDelta !== undefined) {
    compact.pd = session.progressionDelta;
  }
  if (session.step3) {
    compact.s3 = serializeAttempt(session.step3);
  }

  return compact;
}

function deserializeSession(compact: CompactSession): FluencySession {
  const step1 = deserializeAttempt(compact.s1);
  const step3 = compact.s3 ? deserializeAttempt(compact.s3) : undefined;
  const progressionDelta =
    compact.pd === undefined
      ? step3
        ? step3.mclm - step1.mclm
        : undefined
      : Number(compact.pd);

  return {
    date: Number(compact.d) || step3?.timestamp || step1.timestamp,
    id:
      compact.id ||
      `session-${step1.timestamp}-${compact.sn.trim()}-${compact.tid}`,
    progressionDelta,
    step1,
    step3,
    studentName: String(compact.sn).trim(),
    textId: String(compact.tid),
  };
}

function serializeCustomText(text: ExerciseText): CompactCustomText {
  return {
    ca: text.createdAt,
    co: text.content,
    cq: text.comprehensionQuestions.map((q) => ({
      a: q.answer,
      q: q.question,
    })),
    id: text.id,
    lv: text.level,
    th: text.theme,
    ti: text.title,
    tm: text.targetMclm,
  };
}

function deserializeCustomText(compact: CompactCustomText): ExerciseText {
  const tokenList = tokenizeFrenchText(compact.co);
  return {
    comprehensionQuestions: Array.isArray(compact.cq)
      ? compact.cq.map((q) => ({
          answer: String(q.a ?? ""),
          question: String(q.q ?? ""),
        }))
      : [],
    content: String(compact.co),
    createdAt: Number(compact.ca) || Date.now(),
    id: String(compact.id),
    isCustom: true,
    level: compact.lv,
    targetMclm: Number(compact.tm) || 85,
    theme: String(compact.th || "Personnalisé"),
    title: String(compact.ti),
    tokens: tokenList.map((t) => t.clean),
    wordCount: tokenList.length,
  };
}

/**
 * Construit le payload d'export pour un élève spécifique (ou pour tous les élèves si `studentName === "Tous"`).
 */
export async function buildStudentSyncPayload(options: {
  studentLevel?: FluencyLevel;
  studentName: string;
}): Promise<StudentSyncPayload> {
  const { studentName, studentLevel } = options;
  const allSessions = await db.sessions.orderBy("date").toArray();

  const targetSessions =
    studentName === "Tous"
      ? allSessions
      : allSessions.filter(
          (s) =>
            normalizeStudentName(s.studentName) ===
            normalizeStudentName(studentName)
        );

  // Déduplication préventive à l'export
  const uniqueSessionsMap = new Map<string, FluencySession>();
  for (const session of targetSessions) {
    const key = computeSessionIdentityKey(session);
    const existing = uniqueSessionsMap.get(key);
    if (!existing || isIncomingSessionRicher(existing, session)) {
      uniqueSessionsMap.set(key, session);
    }
  }

  const deduplicatedSessions = [...uniqueSessionsMap.values()];

  // Embarquer uniquement les textes personnalisés référencés par ces séances
  const builtInIds = new Set(INITIAL_TEXTS.map((t) => t.id));
  const referencedCustomTextIds = new Set<string>();
  for (const session of deduplicatedSessions) {
    if (!builtInIds.has(session.textId)) {
      referencedCustomTextIds.add(session.textId);
    }
  }

  const customTexts: CompactCustomText[] = [];
  if (referencedCustomTextIds.size > 0) {
    const foundTexts = await db.texts.bulkGet([...referencedCustomTextIds]);
    for (const t of foundTexts) {
      if (t) {
        customTexts.push(serializeCustomText(t));
      }
    }
  }

  const payload: StudentSyncPayload = {
    exportedAt: Date.now(),
    format: FORMAT_TAG,
    sessions: deduplicatedSessions.map(serializeSession),
    texts: customTexts,
    version: FORMAT_VERSION,
  };

  if (studentName !== "Tous" && studentLevel) {
    payload.student = {
      level: studentLevel,
      name: studentName.trim(),
    };
  }

  return payload;
}

/**
 * Compresse un texte JSON en GZIP via CompressionStream si supporté par le navigateur.
 */
async function compressStringGzip(jsonString: string): Promise<Blob> {
  const encoded = new TextEncoder().encode(jsonString);
  if (typeof CompressionStream !== "undefined") {
    try {
      const stream = new Blob([encoded])
        .stream()
        .pipeThrough(new CompressionStream("gzip"));
      const compressedBuffer = await new Response(stream).arrayBuffer();
      return new Blob([compressedBuffer], {
        type: "application/octet-stream",
      });
    } catch {
      // Fallback JSON brut si CompressionStream échoue
    }
  }
  return new Blob([encoded], { type: "application/json" });
}

/**
 * Lit un fichier importé (supporte automatiquement GZIP ou JSON en clair).
 */
async function readSyncFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Vérification des magic bytes GZIP (0x1f, 0x8b)
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

  if (isGzip) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error(
        "Ce navigateur ne supporte pas la décompression des archives .fluence."
      );
    }
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }

  return new TextDecoder().decode(bytes);
}

/**
 * Déclenche le téléchargement d'un fichier d'historique `.fluence` (GZIP compact) pour un élève.
 */
export async function exportStudentHistoryToFile(options: {
  studentLevel?: FluencyLevel;
  studentName: string;
}): Promise<{ sessionCount: number; fileName: string; byteSize: number }> {
  const payload = await buildStudentSyncPayload(options);
  const jsonString = JSON.stringify(payload);
  const blob = await compressStringGzip(jsonString);

  const safeName =
    options.studentName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(NON_ALPHANUMERIC_REGEX, "-")
      .replace(EDGE_DASH_REGEX, "")
      .toLowerCase() || "eleve";

  const dateIso = new Date().toISOString().slice(0, 10);
  const fileName = `fluence-historique-${safeName}-${dateIso}.fluence`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    byteSize: blob.size,
    fileName,
    sessionCount: payload.sessions.length,
  };
}

/**
 * Détermine si une séance importée apporte davantage d'informations qu'une séance locale existante.
 */
function isIncomingSessionRicher(
  existing: FluencySession,
  incoming: FluencySession
): boolean {
  if (!existing.step3 && incoming.step3) {
    return true;
  }
  const existingAnnotatedCount =
    (existing.step1.annotatedWords?.length ?? 0) +
    (existing.step3?.annotatedWords?.length ?? 0);
  const incomingAnnotatedCount =
    (incoming.step1.annotatedWords?.length ?? 0) +
    (incoming.step3?.annotatedWords?.length ?? 0);

  if (incomingAnnotatedCount > existingAnnotatedCount) {
    return true;
  }

  if (!existing.step1.transcript && incoming.step1.transcript) {
    return true;
  }

  return false;
}

function isValidFluencyLevel(val: unknown): val is FluencyLevel {
  return val === "CE1" || val === "CE2" || val === "CM1" || val === "CM2";
}

/**
 * Importe et fusionne sans doublon un fichier `.fluence` ou `.json` dans la base locale Dexie.
 */
export async function importStudentHistoryFromFile(
  file: File
): Promise<ImportSyncResult> {
  let rawText: string;
  try {
    rawText = await readSyncFileText(file);
  } catch (error) {
    throw new Error(
      "Impossible de lire le fichier. Vérifiez qu'il s'agit bien d'un fichier d'historique Fluence (.fluence ou .json).",
      { cause: error }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      "Le fichier sélectionné n'est pas un fichier de synchronisation Fluence valide.",
      { cause: error }
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { format?: unknown }).format !== FORMAT_TAG ||
    !Array.isArray((parsed as { sessions?: unknown }).sessions)
  ) {
    throw new Error(
      "Format de fichier non reconnu. Utilisez un fichier exporté depuis Fluence (.fluence)."
    );
  }

  const payload = parsed as StudentSyncPayload;

  // 1. Réconcilier les textes personnalisés manquants
  let addedTexts = 0;
  if (Array.isArray(payload.texts) && payload.texts.length > 0) {
    const existingTextIds = new Set(
      (await db.texts.toCollection().primaryKeys()) as string[]
    );
    const textsToInsert: ExerciseText[] = [];

    for (const compactText of payload.texts) {
      if (
        compactText &&
        typeof compactText.id === "string" &&
        typeof compactText.co === "string" &&
        isValidFluencyLevel(compactText.lv) &&
        !existingTextIds.has(compactText.id)
      ) {
        textsToInsert.push(deserializeCustomText(compactText));
        existingTextIds.add(compactText.id);
      }
    }

    if (textsToInsert.length > 0) {
      await db.texts.bulkPut(textsToInsert);
      addedTexts = textsToInsert.length;
    }
  }

  // 2. Déduplication multi-critères des séances (ID, Empreinte FNV-1a, Clé d'identité métier)
  const existingSessions = await db.sessions.toArray();
  const byId = new Map<string, FluencySession>();
  const byFingerprint = new Map<string, FluencySession>();
  const byIdentityKey = new Map<string, FluencySession>();

  const registerSessionInMaps = (session: FluencySession) => {
    byId.set(session.id, session);
    byFingerprint.set(computeSessionFingerprint(session), session);
    byIdentityKey.set(computeSessionIdentityKey(session), session);
  };

  for (const existing of existingSessions) {
    registerSessionInMaps(existing);
  }

  let addedSessions = 0;
  let updatedSessions = 0;
  let duplicateSkippedSessions = 0;
  const sessionsToPut: FluencySession[] = [];

  for (const compactSession of payload.sessions) {
    if (
      !compactSession ||
      typeof compactSession.sn !== "string" ||
      typeof compactSession.tid !== "string" ||
      !compactSession.s1
    ) {
      continue;
    }

    const incoming = deserializeSession(compactSession);
    const incomingFp = computeSessionFingerprint(incoming);
    const incomingIdentity = computeSessionIdentityKey(incoming);

    const matchedExisting =
      byId.get(incoming.id) ??
      byFingerprint.get(compactSession.fp) ??
      byFingerprint.get(incomingFp) ??
      byIdentityKey.get(incomingIdentity);

    if (!matchedExisting) {
      sessionsToPut.push(incoming);
      registerSessionInMaps(incoming);
      addedSessions += 1;
    } else if (isIncomingSessionRicher(matchedExisting, incoming)) {
      // Conserver l'ID local existant pour mettre à jour proprement l'entrée sans créer de doublon
      const merged: FluencySession = {
        ...incoming,
        id: matchedExisting.id,
      };
      sessionsToPut.push(merged);
      registerSessionInMaps(merged);
      updatedSessions += 1;
    } else {
      duplicateSkippedSessions += 1;
    }
  }

  if (sessionsToPut.length > 0) {
    await db.sessions.bulkPut(sessionsToPut);
  }

  const studentProfile =
    payload.student &&
    typeof payload.student.name === "string" &&
    payload.student.name.trim() &&
    isValidFluencyLevel(payload.student.level)
      ? {
          level: payload.student.level,
          name: payload.student.name.trim(),
        }
      : undefined;

  return {
    addedSessions,
    addedTexts,
    duplicateSkippedSessions,
    studentProfile,
    totalSessionsInFile: payload.sessions.length,
    updatedSessions,
  };
}
