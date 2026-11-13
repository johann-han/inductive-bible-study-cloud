export interface WordMarkupRange { start: number; end: number; tags: ScriptureMarkupId[] }
export type PreviewWordMarkup = Record<string, Record<string, WordMarkupRange[]>>;
export const PREVIEW_WORD_MARKUP_STORAGE_KEY: string;
export function readPreviewWordMarkup(storage?: Storage): PreviewWordMarkup;
export function writePreviewWordMarkup(markup: PreviewWordMarkup, storage?: Storage): boolean;
export function toggleWordMarkup(markup: PreviewWordMarkup, passageKey: string, verse: number, start: number, end: number, tag: ScriptureMarkupId): PreviewWordMarkup;
