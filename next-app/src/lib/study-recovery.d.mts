export type DeletedStudyEntry = {
  id: string;
  book: string;
  chapter: number;
  deletedAt: string;
  record: Record<string, unknown>;
};

export const DELETED_STUDIES_STORAGE_KEY: string;
export function listDeletedStudies(storage: Storage): DeletedStudyEntry[];
export function softDeleteStudy(storage: Storage, book: string, chapter: number, deletedAt?: string): DeletedStudyEntry;
export function restoreDeletedStudy(storage: Storage, id: string): { book: string; chapter: number; activeStage: string };
export function permanentlyDeleteStudy(storage: Storage, id: string): { book: string; chapter: number };
