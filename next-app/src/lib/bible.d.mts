export type BibleTranslation = 'KJV' | 'BSB' | 'ASV' | 'WEB' | 'BBE';
export interface BibleBook {
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  helloAoId: string;
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
}
export interface SavedPassage {
  book: string;
  chapter: number;
  translation: BibleTranslation;
}
export declare const BIBLE_BOOKS: readonly BibleBook[];
export declare const BIBLE_TRANSLATIONS: readonly BibleTranslation[];
export declare const LAST_READING_STORAGE_KEY: string;
export declare function getBibleBook(name: string): BibleBook | undefined;
export declare function readSavedPassage(storage?: Storage): SavedPassage | null;
export declare function writeSavedPassage(passage: SavedPassage, storage?: Storage): boolean;
export declare function fetchBibleChapter(
  book: string,
  chapter: number,
  translation: BibleTranslation,
  options?: { signal?: AbortSignal; fetcher?: typeof fetch }
): Promise<BibleChapter>;
