import test from 'node:test';
import assert from 'node:assert/strict';
import { selectVerseRange, toggleVerseSelection } from '../next-app/src/lib/verse-selection.mjs';

test('plain clicks add verses without dropping earlier selections', () => {
  let selected = [];
  selected = toggleVerseSelection(selected, 2);
  selected = toggleVerseSelection(selected, 3);
  selected = toggleVerseSelection(selected, 7);
  assert.deepEqual(selected, [2, 3, 7]);
});

test('clicking a selected verse removes only that verse', () => {
  assert.deepEqual(toggleVerseSelection([2, 3, 7], 3), [2, 7]);
});

test('shift selection includes every verse between the anchor and target', () => {
  assert.deepEqual(selectVerseRange(2, 7), [2, 3, 4, 5, 6, 7]);
  assert.deepEqual(selectVerseRange(7, 2), [2, 3, 4, 5, 6, 7]);
});

test('single-verse range contains only the selected verse', () => {
  assert.deepEqual(selectVerseRange(5, 5), [5]);
});
