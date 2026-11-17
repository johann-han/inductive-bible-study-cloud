import type { WordStudyRecord } from './word-studies.mjs';
export interface WordStudyEvidenceDraft {
  kind: 'Lexicon / Strong’s';
  reference: string;
  detail: string;
  source: string;
  sourceUrl?: string;
  sourceId?: string;
}
export declare function buildWordStudyEvidenceDraft(record: WordStudyRecord): WordStudyEvidenceDraft;
