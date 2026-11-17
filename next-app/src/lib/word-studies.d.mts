export interface WordStudyReference {
  book: string;
  chapter: number;
  verse: number;
  translation: 'KJV' | 'BSB' | 'ASV' | 'WEB' | 'BBE';
}
export interface WordStudySense { gloss: string; definition: string; }
export interface WordStudyRecord {
  id: string;
  strongsId: string;
  englishWord: string;
  lemma: string;
  transliteration: string;
  partOfSpeech: string;
  gloss: string;
  senses: WordStudySense[];
  originalText: string;
  language: string;
  parsing: string;
  parsingFull: string;
  reference: WordStudyReference;
  verseText: string;
  source: string;
  sourceUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
export declare const WORD_STUDIES_STORAGE_KEY: string;
export declare const MAX_WORD_STUDIES: number;
export declare function isWordStudyRecord(value: unknown): value is WordStudyRecord;
export declare function normalizeWordStudies(input: unknown): WordStudyRecord[];
export declare function readWordStudies(storage?: Storage): WordStudyRecord[];
export declare function writeWordStudies(records: WordStudyRecord[], storage?: Storage): boolean;
export declare function searchWordStudies(records: WordStudyRecord[], query?: string): WordStudyRecord[];
