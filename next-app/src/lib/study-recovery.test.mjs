import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELETED_STUDIES_STORAGE_KEY,
  auditStudyRecoveryState,
  PREVIEW_DRAFTS_STORAGE_KEY,
  listDeletedStudies,
  permanentlyDeleteStudy,
  restoreDeletedStudy,
  softDeleteStudy
} from './study-recovery.mjs';

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const original = {
  observe: 'Observation note',
  interpret: 'Interpretation note',
  doctrine: 'Doctrine note',
  apply: 'Discipleship response',
  activeStage: 'doctrine',
  versionHistory: [{ id: 'v1', savedAt: '2026-11-17T10:00:00.000Z', activeStage: 'observe',
    sections: { observe: 'Earlier observation', interpret: '', doctrine: '', apply: '' } }]
};

test('soft deletion preserves the full passage draft and moves it to Recently Deleted', () => {
  const storage = makeStorage({ [PREVIEW_DRAFTS_STORAGE_KEY]: JSON.stringify({ 'Genesis|1': original }) });
  const deleted = softDeleteStudy(storage, 'Genesis', 1, '2026-11-18T08:00:00.000Z');
  assert.deepEqual(JSON.parse(storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY)), {});
  assert.equal(deleted.book, 'Genesis');
  assert.equal(deleted.chapter, 1);
  assert.deepEqual(deleted.record, original);
  assert.deepEqual(listDeletedStudies(storage), [deleted]);
});

test('restore returns all four stages, active stage and note history unchanged', () => {
  const storage = makeStorage({ [PREVIEW_DRAFTS_STORAGE_KEY]: JSON.stringify({ 'Genesis|1': original }) });
  const deleted = softDeleteStudy(storage, 'Genesis', 1, '2026-11-18T08:00:00.000Z');
  const restored = restoreDeletedStudy(storage, deleted.id);
  const drafts = JSON.parse(storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY));
  assert.equal(restored.activeStage, 'doctrine');
  assert.deepEqual(drafts['Genesis|1'], original);
  assert.deepEqual(listDeletedStudies(storage), []);
});

test('restore does not silently overwrite a new study at the original passage', () => {
  const storage = makeStorage({ [PREVIEW_DRAFTS_STORAGE_KEY]: JSON.stringify({ 'Genesis|1': original }) });
  const deleted = softDeleteStudy(storage, 'Genesis', 1);
  storage.setItem(PREVIEW_DRAFTS_STORAGE_KEY, JSON.stringify({ 'Genesis|1': { ...original, observe: 'Newer note' } }));
  assert.throws(() => restoreDeletedStudy(storage, deleted.id), /already exists/);
  assert.equal(listDeletedStudies(storage).length, 1);
});

test('permanent deletion removes only the selected trash entry', () => {
  const storage = makeStorage({ [PREVIEW_DRAFTS_STORAGE_KEY]: JSON.stringify({ 'Genesis|1': original, 'John|1': original }) });
  const deletedA = softDeleteStudy(storage, 'Genesis', 1);
  const deletedB = softDeleteStudy(storage, 'John', 1);
  assert.deepEqual(permanentlyDeleteStudy(storage, deletedA.id), { book: 'Genesis', chapter: 1 });
  assert.deepEqual(listDeletedStudies(storage).map(item => item.id), [deletedB.id]);
  assert.deepEqual(JSON.parse(storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY)), {});
});

test('malformed or invalid trash fails closed without changing the active study map', () => {
  for (const badTrash of ['{', JSON.stringify([{ id: 'bad', book: 'Atlantis', chapter: 1, deletedAt: '2026-11-18T08:00:00.000Z', record: original }])]) {
    const storage = makeStorage({
      [PREVIEW_DRAFTS_STORAGE_KEY]: JSON.stringify({ 'Genesis|1': original }),
      [DELETED_STUDIES_STORAGE_KEY]: badTrash
    });
    assert.throws(() => softDeleteStudy(storage, 'Genesis', 1));
    assert.deepEqual(JSON.parse(storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY)), { 'Genesis|1': original });
  }
});

test('restore refuses to proceed when a storage write fails and rolls back earlier writes', () => {
  const values = new Map([
    [PREVIEW_DRAFTS_STORAGE_KEY, JSON.stringify({})],
    [DELETED_STUDIES_STORAGE_KEY, JSON.stringify([{
      id: 'gone', book: 'Genesis', chapter: 1,
      deletedAt: '2026-11-18T08:00:00.000Z', record: original
    }])]
  ]);
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      if (key === DELETED_STUDIES_STORAGE_KEY && String(value) === '[]') throw new Error('quota');
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); }
  };
  assert.throws(() => restoreDeletedStudy(storage, 'gone'), /rolled back/);
  assert.deepEqual(JSON.parse(values.get(PREVIEW_DRAFTS_STORAGE_KEY)), {});
  assert.equal(JSON.parse(values.get(DELETED_STUDIES_STORAGE_KEY)).length, 1);
});

test('integrity audit reports healthy active and deleted studies without changing storage', () => {
  const deleted = {
    id: 'gone', book: 'John', chapter: 1,
    deletedAt: '2026-11-18T08:00:00.000Z',
    record: { ...original }
  };
  const initial = {
    [PREVIEW_DRAFTS_STORAGE_KEY]: JSON.stringify({ 'Genesis|1': original }),
    [DELETED_STUDIES_STORAGE_KEY]: JSON.stringify([deleted])
  };
  const storage = makeStorage(initial);
  const beforeActive = storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY);
  const beforeTrash = storage.getItem(DELETED_STUDIES_STORAGE_KEY);
  const report = auditStudyRecoveryState(storage);
  assert.equal(report.status, 'healthy');
  assert.equal(report.readOnly, true);
  assert.equal(report.activeStudyCount, 1);
  assert.equal(report.deletedStudyCount, 1);
  assert.equal(report.issueCount, 0);
  assert.equal(storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY), beforeActive);
  assert.equal(storage.getItem(DELETED_STUDIES_STORAGE_KEY), beforeTrash);
});

test('integrity audit identifies malformed JSON and leaves the raw value untouched', () => {
  const storage = makeStorage({
    [PREVIEW_DRAFTS_STORAGE_KEY]: '{',
    [DELETED_STUDIES_STORAGE_KEY]: '[]'
  });
  const report = auditStudyRecoveryState(storage);
  assert.equal(report.status, 'unreadable');
  assert.equal(report.errorCount, 1);
  assert.equal(report.issues[0].code, 'invalid_json');
  assert.equal(storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY), '{');
});

test('integrity audit reports invalid active keys and malformed records', () => {
  const active = {
    'Atlantis|1': original,
    'Genesis|2': null
  };
  const storage = makeStorage({
    [PREVIEW_DRAFTS_STORAGE_KEY]: JSON.stringify(active),
    [DELETED_STUDIES_STORAGE_KEY]: '[]'
  });
  const report = auditStudyRecoveryState(storage);
  assert.equal(report.status, 'attention');
  assert.ok(report.issues.some(issue => issue.code === 'invalid_active_passage'));
  assert.ok(report.issues.some(issue => issue.code === 'invalid_study_record'));
});

test('integrity audit flags duplicate deleted passage identities and incomplete note records', () => {
  const entry = {
    id: 'gone', book: 'Genesis', chapter: 1,
    deletedAt: '2026-11-18T08:00:00.000Z',
    record: { observe: 'Observation', activeStage: 'observe' }
  };
  const duplicate = { ...entry, id: 'gone-copy' };
  const storage = makeStorage({
    [PREVIEW_DRAFTS_STORAGE_KEY]: '{}',
    [DELETED_STUDIES_STORAGE_KEY]: JSON.stringify([entry, duplicate])
  });
  const report = auditStudyRecoveryState(storage);
  assert.equal(report.status, 'attention');
  assert.ok(report.issues.some(issue => issue.code === 'duplicate_deleted_passage'));
  assert.equal(report.warningCount, 6);
  assert.equal(report.errorCount, 1);
});

test('integrity audit flags invalid note-version history without modifying it', () => {
  const record = {
    ...original,
    versionHistory: [{ id: 'bad', savedAt: 'not-a-date', activeStage: 'unknown', sections: {} }]
  };
  const storage = makeStorage({ [PREVIEW_DRAFTS_STORAGE_KEY]: JSON.stringify({ 'Genesis|1': record }) });
  const before = storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY);
  const report = auditStudyRecoveryState(storage);
  assert.ok(report.issues.some(issue => issue.code === 'invalid_note_history'));
  assert.equal(storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY), before);
});
