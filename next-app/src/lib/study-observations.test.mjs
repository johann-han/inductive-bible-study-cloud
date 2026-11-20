import test from 'node:test';
import assert from 'node:assert/strict';
import { listPassageObservations } from './study-observations.mjs';

const verses = [
  { number: 1, text: 'In the beginning God created the heavens and the earth.' },
  { number: 2, text: 'The earth was formless and void.' }
];

test('returns no observations when a passage has no Scripture markings', () => {
  assert.deepEqual(listPassageObservations({ passageKey: 'Genesis|1', verses }), []);
});

test('lists whole-verse observations with valid, unique categories', () => {
  const result = listPassageObservations({
    passageKey: 'Genesis|1',
    verses,
    scriptureMarkup: { 'Genesis|1': { '2': ['contrast', 'key-word', 'contrast', 'not-a-category'] } }
  });
  assert.deepEqual(result, [{
    id: 'verse:2',
    kind: 'verse',
    verse: 2,
    text: 'The earth was formless and void.',
    tags: ['contrast', 'key-word'],
    start: 0,
    end: verses[1].text.length
  }]);
});

test('extracts highlighted phrase text by its saved offsets', () => {
  const phrase = 'beginning God';
  const start = verses[0].text.indexOf(phrase);
  const result = listPassageObservations({
    passageKey: 'Genesis|1',
    verses,
    wordMarkup: { 'Genesis|1': { '1': [{ start, end: start + phrase.length, tags: ['key-word'] }] } }
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'phrase');
  assert.equal(result[0].text, phrase);
  assert.equal(result[0].verse, 1);
});

test('ignores malformed, out-of-range and unclassified phrase ranges', () => {
  const result = listPassageObservations({
    passageKey: 'Genesis|1',
    verses,
    wordMarkup: { 'Genesis|1': { '1': [
      { start: -1, end: 3, tags: ['key-word'] },
      { start: 4, end: 4, tags: ['key-word'] },
      { start: 4, end: 999, tags: ['key-word'] },
      { start: 0, end: 3, tags: ['unknown'] }
    ] } }
  });
  assert.deepEqual(result, []);
});

test('returns entries in passage order without parsing freeform notes', () => {
  const result = listPassageObservations({
    passageKey: 'Genesis|1',
    verses,
    scriptureMarkup: { 'Genesis|1': { '2': ['command'], '1': ['promise'] } },
    wordMarkup: { 'Genesis|1': { '1': [{ start: 4, end: 13, tags: ['key-word'] }] } }
  });
  assert.deepEqual(result.map(item => item.kind), ['verse', 'phrase', 'verse']);
  assert.deepEqual(result.map(item => item.verse), [1, 1, 2]);
});
