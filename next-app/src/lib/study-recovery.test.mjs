import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELETED_STUDIES_STORAGE_KEY,
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

const KEY = 'ibs-next-generation-preview-drafts-v1';
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
  const storage = makeStorage({ [KEY]: JSON.stringify({ 'Genesis|1': original }) });
  const deleted = softDeleteStudy(storage, 'Genesis', 1, '2026-11-18T08:00:00.000Z');
  assert.deepEqual(JSON.parse(storage.getItem(KEY)), {});
  assert.equal(deleted.book, 'Genesis');
  assert.equal(deleted.chapter, 1);
  assert.deepEqual(deleted.record, original);
  assert.deepEqual(listDeletedStudies(storage), [deleted]);
});

test('restore returns all four stages, active stage and note history unchanged', () => {
  const storage = makeStorage({ [KEY]: JSON.stringify({ 'Genesis|1': original }) });
  const deleted = softDeleteStudy(storage, 'Genesis', 1, '2026-11-18T08:00:00.000Z');
  const restored = restoreDeletedStudy(storage, deleted.id);
  const drafts = JSON.parse(storage.getItem(KEY));
  assert.equal(restored.activeStage, 'doctrine');
  assert.deepEqual(drafts['Genesis|1'], original);
  assert.deepEqual(listDeletedStudies(storage), []);
});

test('restore does not silently overwrite a new study at the original passage', () => {
  const storage = makeStorage({ [KEY]: JSON.stringify({ 'Genesis|1': original }) });
  const deleted = softDeleteStudy(storage, 'Genesis', 1);
  storage.setItem(KEY, JSON.stringify({ 'Genesis|1': { ...original, observe: 'Newer note' } }));
  assert.throws(() => restoreDeletedStudy(storage, deleted.id), /already exists/);
  assert.equal(listDeletedStudies(storage).length, 1);
});

test('permanent deletion removes only the selected trash entry', () => {
  const storage = makeStorage({ [KEY]: JSON.stringify({ 'Genesis|1': original, 'John|1': original }) });
  const deletedA = softDeleteStudy(storage, 'Genesis', 1);
  const deletedB = softDeleteStudy(storage, 'John', 1);
  assert.deepEqual(permanentlyDeleteStudy(storage, deletedA.id), { book: 'Genesis', chapter: 1 });
  assert.deepEqual(listDeletedStudies(storage).map(item => item.id), [deletedB.id]);
  assert.deepEqual(JSON.parse(storage.getItem(KEY)), {});
});

test('malformed trash fails closed without changing the active study map', () => {
  const storage = makeStorage({
    [KEY]: JSON.stringify({ 'Genesis|1': original }),
    [DELETED_STUDIES_STORAGE_KEY]: '{'
  });
  assert.throws(() => softDeleteStudy(storage, 'Genesis', 1), /invalid JSON/);
  assert.deepEqual(JSON.parse(storage.getItem(KEY)), { 'Genesis|1': original });
});

test('restore refuses to proceed when a storage write fails and rolls back earlier writes', () => {
  const values = new Map([
    [KEY, JSON.stringify({})],
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
  assert.deepEqual(JSON.parse(values.get(KEY)), {});
  assert.equal(JSON.parse(values.get(DELETED_STUDIES_STORAGE_KEY)).length, 1);
});
