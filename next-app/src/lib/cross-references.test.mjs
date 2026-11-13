import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREVIEW_CROSS_REFERENCES_STORAGE_KEY,
  addPreviewCrossReference,
  deletePreviewCrossReference,
  formatCrossReference,
  readPreviewCrossReferences,
  writePreviewCrossReferences
} from './cross-references.mjs';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem(key) { return values.has(key) ? values.get(key) : null; }, setItem(key, value) { values.set(key, String(value)); } };
}
const sample = { id: 'ref-1', sourceBook: 'Romans', sourceChapter: 8, sourceVerse: 28, targetBook: 'Genesis', targetChapter: 50, targetVerse: 20, note: 'Compare the themes of providence.', createdAt: '2026-11-13T10:00:00.000Z' };

test('adds a valid user reference and prevents duplicate IDs', () => {
  const one = addPreviewCrossReference([], sample);
  assert.equal(one.length, 1);
  assert.equal(addPreviewCrossReference(one, sample).length, 1);
});
test('rejects invalid book and chapter references', () => {
  assert.deepEqual(addPreviewCrossReference([], { ...sample, targetBook: 'Not a Bible book' }), []);
  assert.deepEqual(addPreviewCrossReference([], { ...sample, sourceChapter: 99 }), []);
});
test('round-trips user references through preview-only storage', () => {
  const storage = memoryStorage();
  assert.equal(writePreviewCrossReferences([sample], storage), true);
  assert.deepEqual(readPreviewCrossReferences(storage), [sample]);
  assert.ok(storage.getItem(PREVIEW_CROSS_REFERENCES_STORAGE_KEY));
});
test('deletes one reference without affecting others', () => {
  const second = { ...sample, id: 'ref-2', sourceVerse: null };
  assert.deepEqual(deletePreviewCrossReference([sample, second], 'ref-1'), [second]);
});
test('formats chapter and verse references clearly', () => {
  assert.deepEqual(formatCrossReference(sample), { source: 'Romans 8:28', target: 'Genesis 50:20' });
  assert.deepEqual(formatCrossReference({ ...sample, sourceVerse: null, targetVerse: null }), { source: 'Romans 8', target: 'Genesis 50' });
});
test('handles malformed storage safely', () => {
  const storage = memoryStorage({ [PREVIEW_CROSS_REFERENCES_STORAGE_KEY]: '{bad' });
  assert.deepEqual(readPreviewCrossReferences(storage), []);
});
