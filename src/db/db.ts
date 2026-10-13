import type { Table } from "dexie";
import { Dexie } from "dexie";

export type FluencyLevel = "CE1" | "CE2" | "CM1" | "CM2";

export interface ExerciseText {
  comprehensionQuestions: { question: string; answer: string }[];
  // Texte complet
  content: string;
  createdAt: number;
  id: string;
  isCustom: boolean;
  level: FluencyLevel;
  targetMclm: number;
  theme: string;
  title: string;
  // Liste des mots normalisés pour alignement
  tokens: string[];
  wordCount: number;
}

export interface FluencyAttempt {
  annotatedWords?: {
    expectedIndex?: number;
    word: string;
    status: "correct" | "error" | "hesitation" | "unreached";
    spoken?: string;
    timestampMs?: number;
  }[];
  audioBlob?: Blob;
  audioUrl?: string;
  // Max 60s
  durationSeconds: number;
  errorDetails: {
    expectedWord: string;
    spokenWord?: string;
    type: "substitution" | "omission" | "inversion" | "hesitation";
    timestampOffsetMs?: number;
  }[];
  errorsCount: number;
  lastWordReachedIndex: number;
  mclm: number;
  // Mots ayant posé problème pour remédiation
  stumbledWords: string[];
  timestamp: number;
  transcript?: string;
  wordsAttempted: number;
}

export interface FluencySession {
  date: number;
  id: string;
  // step3.mclm - step1.mclm
  progressionDelta?: number;
  // Lecture initiale chrono 60s
  step1: FluencyAttempt;
  // Défi chrono 60s
  step3?: FluencyAttempt;
  studentName: string;
  textId: string;
}

export class FluencyDatabase extends Dexie {
  texts!: Table<ExerciseText, string>;
  sessions!: Table<FluencySession, string>;

  constructor() {
    super("FluencyAppDB");
    this.version(1).stores({
      sessions: "id, studentName, textId, date",
      texts: "id, level, theme, createdAt",
    });
  }
}

export const db = new FluencyDatabase();
