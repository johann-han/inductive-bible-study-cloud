import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREVIEW_MARKUP_STORAGE_KEY,
  SCRIPTURE_MARKUP_TYPES,
  readPreviewMarkup,
  toggleVerseMarkup,
  writePreviewMarkup
} from './scripture-markup.mjs';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

test('markup toggles are scoped by passage and verse and can be removed', () => {
  let markup = toggleVerseMarkup({}, 'Genesis|1', 1, 'key-word');
  markup = toggleVerseMarkup(markup, 'Genesis|1', 2, 'promise');
  markup = toggleVerseMarkup(markup, 'John|3', 16, 'promise');
  assert.deepEqual(markup['Genesis|1']['1'], ['key-word']);
  assert.deepEqual(markup['Genesis|1']['2'], ['promise']);
  assert.deepEqual(markup['John|3']['16'], ['promise']);
  markup = toggleVerseMarkup(markup, 'Genesis|1', 1, 'key-word');
  assert.equal(markup['Genesis|1']['1'], undefined);
});

test('only known markup types and positive verse numbers are persisted', () => {
  const storage = memoryStorage();
  const dirty = {
    'Genesis|1': { '1': ['key-word', 'unknown', 'key-word'], '0': ['command'], '-2': ['contrast'] },
    invalid: { '1': ['promise'] }
  };
  assert.equal(writePreviewMarkup(dirty, storage), true);
  const restored = readPreviewMarkup(storage);
  assert.deepEqual(restored['Genesis|1']['1'], ['key-word']);
  assert.equal(restored.invalid, undefined);
  assert.equal(Object.keys(SCRIPTURE_MARKUP_TYPES).length, 6);
});

test('markup survives a preview reload using its dedicated storage key', () => {
  const storage = memoryStorage();
  const markup = toggleVerseMarkup({}, 'Romans|8', 28, 'promise');
  writePreviewMarkup(markup, storage);
  assert.deepEqual(readPreviewMarkup(storage)['Romans|8']['28'], ['promise']);
  assert.ok(storage.getItem(PREVIEW_MARKUP_STORAGE_KEY));
});

test('malformed storage is handled safely', () => {
  const storage = memoryStorage({ [PREVIEW_MARKUP_STORAGE_KEY]: '{broken' });
  assert.deepEqual(Object.keys(readPreviewMarkup(storage)), []);
});
