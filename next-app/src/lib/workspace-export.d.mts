export type WorkspaceArchive = {
  format: 'ibs-workspace-archive';
  archiveVersion: 1;
  exportedAt: string;
  application: 'IBS Next-generation preview';
  stores: Record<string, unknown>;
  counts: Record<string, number>;
};

export const WORKSPACE_EXPORT_STORES: Readonly<Record<string, string>>;

export function buildPreviewWorkspaceArchive(
  storage: { getItem(key: string): string | null },
  metadata?: { exportedAt?: string }
): WorkspaceArchive;
