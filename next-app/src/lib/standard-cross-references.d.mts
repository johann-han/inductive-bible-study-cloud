export interface StandardBibleReference {
  book: string;
  chapter: number;
  verse: number | null;
  endVerse: number | null;
  label: string;
}
export interface StandardCrossReferenceRow {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  anchor: string;
  references: StandardBibleReference[];
}
export const STANDARD_XREF_SOURCE: Readonly<{
  name: string; url: string; license: string; attribution: string; revision: string;
}>;
export function parseStandardReference(value: string): StandardBibleReference | null;
export function parseStandardCrossReferenceTsv(text: string, filter?: { book?: string; chapter?: number }): StandardCrossReferenceRow[];
export function getStandardCrossReferences(rows: StandardCrossReferenceRow[], filter: { book: string; chapter: number; verse?: number }): StandardCrossReferenceRow[];
export function loadStandardCrossReferences(
  translation?: 'BSB' | 'KJV',
  options?: { signal?: AbortSignal; book?: string; chapter?: number; fetcher?: (url: string, init?: RequestInit) => Promise<{ ok: boolean; status?: number; text(): Promise<string> }> }
): Promise<StandardCrossReferenceRow[]>;
