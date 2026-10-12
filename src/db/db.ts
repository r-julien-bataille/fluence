import Dexie, { Table } from 'dexie';

export type FluencyLevel = 'CE1' | 'CE2' | 'CM1' | 'CM2';

export interface ExerciseText {
  id: string;
  title: string;
  level: FluencyLevel;
  theme: string;
  content: string; // Texte complet
  tokens: string[]; // Liste des mots normalisés pour alignement
  targetMclm: number;
  wordCount: number;
  comprehensionQuestions: { question: string; answer: string }[];
  isCustom: boolean;
  createdAt: number;
}

export interface FluencyAttempt {
  timestamp: number;
  durationSeconds: number; // Max 60s
  wordsAttempted: number;
  errorsCount: number;
  mclm: number;
  lastWordReachedIndex: number;
  stumbledWords: string[]; // Mots ayant posé problème pour remédiation
  errorDetails: {
    expectedWord: string;
    spokenWord?: string;
    type: 'substitution' | 'omission' | 'inversion' | 'hesitation';
    timestampOffsetMs?: number;
  }[];
  transcript?: string;
  annotatedWords?: {
    expectedIndex?: number;
    word: string;
    status: 'correct' | 'error' | 'hesitation' | 'unreached';
    spoken?: string;
    timestampMs?: number;
  }[];
  audioBlob?: Blob;
  audioUrl?: string;
}

export interface FluencySession {
  id: string;
  studentName: string;
  textId: string;
  date: number;
  step1: FluencyAttempt; // Lecture initiale chrono 60s
  step3?: FluencyAttempt; // Défi chrono 60s
  progressionDelta?: number; // step3.mclm - step1.mclm
}

export class FluencyDatabase extends Dexie {
  texts!: Table<ExerciseText, string>;
  sessions!: Table<FluencySession, string>;

  constructor() {
    super('FluencyAppDB');
    this.version(1).stores({
      texts: 'id, level, theme, createdAt',
      sessions: 'id, studentName, textId, date',
    });
  }
}

export const db = new FluencyDatabase();
