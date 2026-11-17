import test from 'node:test';
import assert from 'node:assert/strict';
import { persistWorkspaceArchiveWrites } from './workspace-archive-storage.mjs';

function makeStorage(initial = {}, options = {}) {
  const values = new Map(Object.entries(initial));
  let failed = false;
  return {
    values,
    getItem(key) {
      if (options.failReadKey === key) throw new Error('Simulated storage read failure');
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (!failed && options.failWriteKey === key) {
        failed = true;
        throw new Error('Simulated quota failure');
      }
      if (options.failRollbackKey === key && failed && value === initial[key]) {
        throw new Error('Simulated rollback failure');
      }
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test('persists all reviewed archive writes when storage accepts them', () => {
  const storage = makeStorage({ drafts: 'old-drafts', evidence: 'old-evidence' });
  const count = persistWorkspaceArchiveWrites(storage, [
    ['drafts', 'new-drafts'],
    ['evidence', 'new-evidence']
  ]);
  assert.equal(count, 2);
  assert.equal(storage.getItem('drafts'), 'new-drafts');
  assert.equal(storage.getItem('evidence'), 'new-evidence');
});

test('rolls back earlier and failed-key writes when a later storage write fails', () => {
  const storage = makeStorage(
    { drafts: 'old-drafts', evidence: 'old-evidence' },
    { failWriteKey: 'evidence' }
  );
  assert.throws(
    () => persistWorkspaceArchiveWrites(storage, [
      ['drafts', 'new-drafts'],
      ['evidence', 'new-evidence'],
      ['claimSynthesis', 'new-claims']
    ]),
    /Simulated quota failure/
  );
  assert.equal(storage.getItem('drafts'), 'old-drafts');
  assert.equal(storage.getItem('evidence'), 'old-evidence');
  assert.equal(storage.getItem('claimSynthesis'), null);
});

test('does not mutate storage when the snapshot read fails', () => {
  const storage = makeStorage(
    { drafts: 'old-drafts', evidence: 'old-evidence' },
    { failReadKey: 'evidence' }
  );
  assert.throws(
    () => persistWorkspaceArchiveWrites(storage, [
      ['drafts', 'new-drafts'],
      ['evidence', 'new-evidence']
    ]),
    /Simulated storage read failure/
  );
  assert.equal(storage.getItem('drafts'), 'old-drafts');
});

test('reports when rollback itself cannot restore a previous value', () => {
  const storage = makeStorage(
    { drafts: 'old-drafts', evidence: 'old-evidence' },
    { failWriteKey: 'evidence', failRollbackKey: 'drafts' }
  );
  assert.throws(
    () => persistWorkspaceArchiveWrites(storage, [
      ['drafts', 'new-drafts'],
      ['evidence', 'new-evidence']
    ]),
    /automatic rollback was incomplete/
  );
  assert.equal(storage.values.get('drafts'), 'new-drafts');
});

test('rejects malformed and duplicate storage write keys before any mutation', () => {
  const storage = makeStorage({ drafts: 'old-drafts' });
  assert.throws(() => persistWorkspaceArchiveWrites(storage, [['drafts', 'a'], ['drafts', 'b']]), /duplicate storage keys/);
  assert.throws(() => persistWorkspaceArchiveWrites(storage, [['', 'value']]), /key\\/value string pairs/);
  assert.equal(storage.getItem('drafts'), 'old-drafts');
});
