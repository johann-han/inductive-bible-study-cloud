export type ScriptureMarkupId = 'key-word' | 'repeated-idea' | 'contrast' | 'command' | 'promise' | 'question';
export interface ScriptureMarkupType {
  id: ScriptureMarkupId;
  label: string;
  symbol: string;
}
export type PreviewMarkup = Record<string, Record<string, ScriptureMarkupId[]>>;
export const PREVIEW_MARKUP_STORAGE_KEY: string;
export const SCRIPTURE_MARKUP_TYPES: readonly ScriptureMarkupType[];
export function readPreviewMarkup(storage?: Storage): PreviewMarkup;
export function writePreviewMarkup(markup: PreviewMarkup, storage?: Storage): boolean;
export function toggleVerseMarkup(markup: PreviewMarkup, passageKey: string, verse: number, tag: ScriptureMarkupId): PreviewMarkup;
