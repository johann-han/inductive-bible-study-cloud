import test from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEW_WORD_MARKUP_STORAGE_KEY, readPreviewWordMarkup, toggleWordMarkup, writePreviewWordMarkup } from './scripture-word-markup.mjs';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
}

test('word markup stores exact text offsets, tags and passage scope', () => {
  let markup = toggleWordMarkup({}, 'Romans|1', 2, 0, 5, 'key-word');
  markup = toggleWordMarkup(markup, 'Romans|1', 2, 10, 15, 'contrast');
  markup = toggleWordMarkup(markup, 'John|3', 16, 0, 4, 'promise');
  assert.deepEqual(markup['Romans|1']['2'], [
    { start: 0, end: 5, tags: ['key-word'] },
    { start: 10, end: 15, tags: ['contrast'] }
  ]);
  assert.deepEqual(markup['John|3']['16'], [{ start: 0, end: 4, tags: ['promise'] }]);
});

test('word markup toggles tags on the same range and removes empty ranges', () => {
  let markup = toggleWordMarkup({}, 'Romans|1', 2, 0, 5, 'key-word');
  markup = toggleWordMarkup(markup, 'Romans|1', 2, 0, 5, 'contrast');
  assert.deepEqual(markup['Romans|1']['2'][0].tags, ['key-word', 'contrast']);
  markup = toggleWordMarkup(markup, 'Romans|1', 2, 0, 5, 'key-word');
  markup = toggleWordMarkup(markup, 'Romans|1', 2, 0, 5, 'contrast');
  assert.equal(markup['Romans|1'], undefined);
});

test('word markup persists and rejects malformed ranges or unknown tags', () => {
  const store = storage();
  let markup = toggleWordMarkup({}, 'Romans|8', 28, 6, 13, 'repeated-idea');
  assert.equal(toggleWordMarkup(markup, 'Romans|8', 28, -1, 2, 'promise'), markup);
  assert.equal(toggleWordMarkup(markup, 'Romans|8', 28, 2, 2, 'promise'), markup);
  assert.equal(toggleWordMarkup(markup, 'Romans|8', 28, 2, 3, 'unknown'), markup);
  assert.equal(writePreviewWordMarkup(markup, store), true);
  assert.deepEqual(readPreviewWordMarkup(store)['Romans|8']['28'], [{ start: 6, end: 13, tags: ['repeated-idea'] }]);
  assert.ok(store.getItem(PREVIEW_WORD_MARKUP_STORAGE_KEY));
});
