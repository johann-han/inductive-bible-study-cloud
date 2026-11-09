'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  normalizeStrongs,
  mapVerseWordsToAnnotations,
  mapChapterToAnnotations
} = require('../js/helloao-bsb-interlinear.js');

test('normalizes Strong numbers while rejecting malformed identifiers', () => {
  assert.equal(normalizeStrongs('H7225'), 'H7225');
  assert.equal(normalizeStrongs('G3056'), 'G3056');
  assert.equal(normalizeStrongs('H430'), 'H0430');
  assert.equal(normalizeStrongs('H1961a'), 'H1961');
  assert.equal(normalizeStrongs('not-a-number'), null);
});

test('maps BSB gloss phrases to exact verse-text offsets in BSB order', () => {
  const text = 'In the beginning God created the heavens and the earth.';
  const annotations = mapVerseWordsToAnnotations(text, [
    { pos: 2, bsbPos: 4, language: 'hebrew', text: 'בָּרָ֣א', transliteration: 'bā·rā', parsing: 'V-Qal-Perf-3ms', parsingFull: 'Verb - Qal - Perfect - third person masculine singular', strongs: 'H1254', gloss: 'created' },
    { pos: 1, bsbPos: 1, language: 'hebrew', text: 'בְּרֵאשִׁ֖ית', transliteration: 'bə·rê·šîṯ', parsing: 'Prep-b | N-fs', strongs: 'H7225', gloss: 'In the beginning' }
  ]);

  assert.deepEqual(annotations.map(item => text.slice(item.start, item.end)), ['In the beginning', 'created']);
  assert.deepEqual(annotations.map(item => item.strongs[0]), ['H7225', 'H1254']);
  assert.equal(annotations[0].originalText, 'בְּרֵאשִׁ֖ית');
  assert.equal(annotations[1].parsingFull, 'Verb - Qal - Perfect - third person masculine singular');
});

test('skips null Strong numbers, untranslated words, and glosses not found exactly', () => {
  const annotations = mapVerseWordsToAnnotations('The Lord is good.', [
    { bsbPos: 1, strongs: null, gloss: 'The', text: 'אֵת' },
    { bsbPos: 2, strongs: 'H3068', gloss: 'Lord', text: 'יְהוָה' },
    { bsbPos: 3, strongs: 'H2896', gloss: 'goodness', text: 'טוֹב' },
    { bsbPos: 4, strongs: 'H0001', gloss: null, text: 'אָב' }
  ]);

  assert.equal(annotations.length, 1);
  assert.equal(annotations[0].strongs[0], 'H3068');
  assert.equal(annotations[0].start, 4);
  assert.equal(annotations[0].end, 8);
});

test('does not match partial words or reuse overlapping text', () => {
  const annotations = mapVerseWordsToAnnotations('The Lord is the Lord.', [
    { bsbPos: 1, strongs: 'H3068', gloss: 'Lord' },
    { bsbPos: 2, strongs: 'H3068', gloss: 'Lord' },
    { bsbPos: 3, strongs: 'H0001', gloss: 'or' }
  ]);

  assert.deepEqual(annotations.map(item => item.start), [4, 16]);
  assert.deepEqual(annotations.map(item => item.end), [8, 20]);
});

test('maps only verse entries that have matching BSB text', () => {
  const result = mapChapterToAnnotations(
    [{ number: 1, text: 'In the beginning God created.' }, { number: 2, text: 'The earth was empty.' }],
    [
      { verse: 1, words: [{ bsbPos: 1, strongs: 'H7225', gloss: 'In the beginning', text: 'בְּרֵאשִׁ֖ית' }] },
      { verse: 2, words: [{ bsbPos: 1, strongs: 'H0776', gloss: 'earth', text: 'אֶרֶץ' }] },
      { verse: 3, words: [{ bsbPos: 1, strongs: 'H0430', gloss: 'God', text: 'אֱלֹהִים' }] }
    ]
  );

  assert.equal(result['1'].length, 1);
  assert.equal(result['2'].length, 1);
  assert.equal(result['3'], undefined);
});
