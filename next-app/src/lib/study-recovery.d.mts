export type DeletedStudyEntry = {
  id: string;
  book: string;
  chapter: number;
  deletedAt: string;
  record: Record<string, unknown>;
};

export type StudyRecoveryAuditIssue = {
  severity: 'error' | 'warning';
  code: string;
  store: string;
  location: string;
  message: string;
  recommendedAction: string;
};
export type StudyRecoveryAudit = {
  status: 'healthy' | 'review' | 'attention' | 'unreadable';
  inspectedAt: string;
  readOnly: true;
  activeStudyCount: number;
  deletedStudyCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  issues: StudyRecoveryAuditIssue[];
};
export function auditStudyRecoveryState(storage: Storage): StudyRecoveryAudit;
export const DELETED_STUDIES_STORAGE_KEY: string;
export const PREVIEW_DRAFTS_STORAGE_KEY: string;
export function listDeletedStudies(storage: Storage): DeletedStudyEntry[];
export function softDeleteStudy(storage: Storage, book: string, chapter: number, deletedAt?: string): DeletedStudyEntry;
export function restoreDeletedStudy(storage: Storage, id: string): { book: string; chapter: number; activeStage: string };
export function permanentlyDeleteStudy(storage: Storage, id: string): { book: string; chapter: number };
