export type StudyNoteVersionStage = 'observe' | 'interpret' | 'doctrine' | 'apply';
export interface StudyNoteVersion {
  id: string;
  savedAt: string;
  activeStage: StudyNoteVersionStage;
  sections: Record<StudyNoteVersionStage, string>;
}
export const STUDY_NOTE_VERSION_LIMIT: 8;
export const STUDY_NOTE_VERSION_INTERVAL_MS: 120000;
export const STUDY_NOTE_VERSION_STAGES: ReadonlyArray<{ key: StudyNoteVersionStage; label: string }>;
export function normalizeStudyNoteVersionHistory(value: unknown): StudyNoteVersion[];
export function appendStudyNoteVersionSnapshot<T extends Record<string, unknown>>(
  draft: T,
  options?: { now?: number; force?: boolean; id?: string }
): T & { versionHistory: StudyNoteVersion[] };
export function countStudyNoteVersionWords(snapshot: Partial<StudyNoteVersion>): Record<StudyNoteVersionStage, { label: string; words: number }>;
export function restoreStudyNoteVersion<T extends Record<string, unknown>>(
  draft: T,
  snapshotId: string,
  options?: { now?: number; id?: string }
): { restored: false; draft: T & { versionHistory: StudyNoteVersion[] } } | {
  restored: true; snapshot: StudyNoteVersion; draft: T & Record<StudyNoteVersionStage, string> & { activeStage: StudyNoteVersionStage; versionHistory: StudyNoteVersion[] }
};
