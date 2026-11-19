export interface ArchiveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function persistWorkspaceArchiveWrites(
  storage: ArchiveStorage,
  writes: Array<readonly [string, string]>
): number;
