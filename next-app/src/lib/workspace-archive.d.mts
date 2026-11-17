export type WorkspaceArchiveStore =
  | 'drafts' | 'scriptureMarkup' | 'wordMarkup' | 'markupColors' | 'crossReferences'
  | 'evidence' | 'claimSynthesis' | 'doctrineReviews' | 'theologicalTensions' | 'dossierVersions' | 'wordStudies';
export interface ValidatedWorkspaceArchive {
  kind: 'workspace' | 'dossier';
  archiveVersion: number;
  exportedAt: string | null;
  stores: Partial<Record<WorkspaceArchiveStore, unknown>>;
  counts: Partial<Record<WorkspaceArchiveStore, number>>;
}
export declare const WORKSPACE_ARCHIVE_STORES: Readonly<Record<WorkspaceArchiveStore, string>>;
export declare function buildWorkspaceArchive(stores: Partial<Record<WorkspaceArchiveStore, unknown>>, metadata?: { exportedAt?: string }): Record<string, unknown>;
export declare function validateWorkspaceArchive(input: string | unknown): ValidatedWorkspaceArchive;
export declare function planWorkspaceArchiveImport(validated: ValidatedWorkspaceArchive, currentStores: Record<string, unknown>): Record<string, { incomingCount: number; identical: number; conflicting: number; newItems: number; conflicts: Array<{ id: string; store: string; description: string }> }>;
export declare function applyWorkspaceArchiveImport(validated: ValidatedWorkspaceArchive, currentStores: Record<string, unknown>, decisions?: Record<string, 'keep' | 'replace' | 'duplicate'>, mode?: 'merge' | 'replace'): Record<string, unknown>;
