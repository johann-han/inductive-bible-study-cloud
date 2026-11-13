export type BibleTranslation = 'KJV' | 'BSB' | 'ASV' | 'WEB' | 'BBE';
export interface BibleBook {
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  helloAoId: string;
}
export interface WordAnnotation {
  start: number;
  end: number;
  strongs: string[];
  originalText: string;
  transliteration: string;
  parsing: string;
  parsingFull: string;
  language: string;
  gloss: string;
}
export interface LexiconSense { gloss: string; definition: string; }
export interface StrongLexiconEntry {
  id: string;
  lemma: string;
  transliteration: string;
  partOfSpeech: string;
  gloss: string;
  senses: LexiconSense[];
  source: string;
  sourceUrl: string;
}
export interface BibleVerse {
  number: number;
  text: string;
}
export interface BibleChapter {
  book: string;
  chapter: number;
  translation: BibleTranslation;
  source: string;
  verses: BibleVerse[];
  annotations: Record<string, WordAnnotation[]>;
}
export type StudyStage = 'observe' | 'interpret' | 'doctrine' | 'apply';
export interface PreviewStudyDraft extends Record<StudyStage, string> {
  activeStage: StudyStage;
}
export interface PreviewDraftEntry {
  book: string;
  chapter: number;
  activeStage: StudyStage;
  writtenStages: StudyStage[];
  stageCount: number;
  wordCount: number;
  preview: string;
}
export type PreviewDrafts = Record<string, PreviewStudyDraft>;
export interface PreviewStageEvidence {
  stage: StudyStage;
  text: string;
  wordCount: number;
}
export interface PreviewDashboardStats {
  studyCount: number;
  stageNoteCount: number;
  wordCount: number;
  stageCounts: Record<StudyStage, number>;
}
export interface SavedPassage {
  book: string;
  chapter: number;
  translation: BibleTranslation;
}
export declare const BIBLE_BOOKS: readonly BibleBook[];
export declare const BIBLE_TRANSLATIONS: readonly BibleTranslation[];
export declare const LAST_READING_STORAGE_KEY: string;
export declare const PREVIEW_DRAFTS_STORAGE_KEY: string;
export declare function getBibleBook(name: string): BibleBook | undefined;
export declare function readPreviewDrafts(storage?: Storage): PreviewDrafts;
export declare function listPreviewDraftEntries(drafts: PreviewDrafts): PreviewDraftEntry[];
export declare function writePreviewDrafts(drafts: PreviewDrafts, storage?: Storage): boolean;
export declare function readSavedPassage(storage?: Storage): SavedPassage | null;
export declare function writeSavedPassage(passage: SavedPassage, storage?: Storage): boolean;
export declare function normalizeStrongsId(value: string): string | null;
export declare function fetchStrongsLexicon(
  strongsId: string,
  options?: { signal?: AbortSignal; fetcher?: typeof fetch }
): Promise<StrongLexiconEntry>;
export declare function fetchBibleChapter(
  book: string,
  chapter: number,
  translation: BibleTranslation,
  options?: { signal?: AbortSignal; fetcher?: typeof fetch }
): Promise<BibleChapter>;

export declare function summarizePreviewDraftEntries(entries: PreviewDraftEntry[]): PreviewDashboardStats;

export declare function getPreviewStageEvidence(draft: Partial<PreviewStudyDraft> | null, activeStage: StudyStage): PreviewStageEvidence[];

export declare function getPreviewWrittenStages(draft: Partial<PreviewStudyDraft> | null): StudyStage[];
