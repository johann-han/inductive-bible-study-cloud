import type { StudyStage } from './bible.mjs';

export interface StudySections {
  observe: string;
  interpret: string;
  doctrine: string;
  apply: string;
}

export interface StudyRecord {
  [key: string]: unknown;
  book: string;
  chapter: number;
  sections: StudySections;
  activeSection: StudyStage;
  updatedAt: string | null;
  deletedAt: string | null;
  scriptureMarkups?: unknown;
  crossReferences?: unknown;
  relatedPassages?: unknown;
  verseMaps?: unknown;
  passageOutline?: unknown;
  versionHistory?: unknown;
  evidenceLinks?: unknown;
  studyClaims?: unknown;
  stageReviews?: unknown;
  cloudSectionExtras: Record<string, unknown>;
}

export interface CloudStudyRow {
  user_id: string;
  book: string;
  chapter: number;
  sections: Record<string, unknown> & StudySections;
  active_section: 'observe' | 'interpret' | 'apply';
  updated_at: string;
  deleted_at: string | null;
}

export declare const STUDY_STAGE_KEYS: readonly StudyStage[];
export declare const CLOUD_ACTIVE_SECTION_KEYS: readonly ('observe' | 'interpret' | 'apply')[];
export declare const DOCTRINE_ACTIVE_STAGE_MARKER: '_activeStage';
export declare function cloudRowToStudyRecord(row: Record<string, unknown>): StudyRecord;
export declare function normalizeLocalStudyRecord(record: Record<string, unknown>, fallbackIdentity?: { book?: string; chapter?: number }): StudyRecord;
export declare function studyRecordToCloudRow(record: Record<string, unknown>, userId: string): CloudStudyRow;
export declare function studyRecordKey(book: string, chapter: number): string;
