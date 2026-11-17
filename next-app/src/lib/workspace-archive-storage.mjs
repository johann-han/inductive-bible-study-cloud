function isStorageLike(storage) {
  return storage && typeof storage.getItem === 'function' &&
    typeof storage.setItem === 'function' && typeof storage.removeItem === 'function';
}

/**
 * Persists a precomputed archive restore plan.
 * The caller must invoke this only after the user explicitly confirms restoration.
 * Existing values are snapshotted before the first write; failed writes trigger
 * reverse-order rollback of every key whose write was attempted.
 */
export function persistWorkspaceArchiveWrites(storage, writes) {
  if (!isStorageLike(storage)) throw new TypeError('A browser-compatible storage interface is required.');
  if (!Array.isArray(writes) || writes.some(entry =>
    !Array.isArray(entry) || entry.length !== 2 ||
    typeof entry[0] !== 'string' || !entry[0].trim() || typeof entry[1] !== 'string')) {
    throw new TypeError('Archive storage writes must be key/value string pairs.');
  }

  const keys = writes.map(([key]) => key);
  if (new Set(keys).size !== keys.length) throw new TypeError('Archive restore contains duplicate storage keys.');

  // Complete the read-only snapshot before the first mutation.
  const before = new Map();
  for (const key of keys) before.set(key, storage.getItem(key));

  const attempted = [];
  try {
    for (const [key, value] of writes) {
      attempted.push(key);
      storage.setItem(key, value);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const key of attempted.reverse()) {
      try {
        const previous = before.get(key);
        if (previous === null) storage.removeItem(key);
        else storage.setItem(key, previous);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length) {
      const failure = new Error(
        'Archive restoration failed and automatic rollback was incomplete. Reload the preview and check its saved data before trying again.',
        { cause: error }
      );
      failure.rollbackErrors = rollbackErrors;
      throw failure;
    }
    throw error;
  }

  return writes.length;
}
