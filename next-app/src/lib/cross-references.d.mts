export interface PreviewCrossReference {
  id: string;
  sourceBook: string;
  sourceChapter: number;
  sourceVerse: number | null;
  targetBook: string;
  targetChapter: number;
  targetVerse: number | null;
  note: string;
  createdAt: string;
}
export const PREVIEW_CROSS_REFERENCES_STORAGE_KEY: string;
export function readPreviewCrossReferences(storage?: Storage): PreviewCrossReference[];
export function writePreviewCrossReferences(items: PreviewCrossReference[], storage?: Storage): boolean;
export function addPreviewCrossReference(items: PreviewCrossReference[], reference: PreviewCrossReference): PreviewCrossReference[];
export function deletePreviewCrossReference(items: PreviewCrossReference[], id: string): PreviewCrossReference[];
export function formatCrossReference(reference: PreviewCrossReference): { source: string; target: string };
