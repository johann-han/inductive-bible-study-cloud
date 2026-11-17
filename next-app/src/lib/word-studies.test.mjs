import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORD_STUDIES_STORAGE_KEY, isWordStudyRecord, normalizeWordStudies,
  readWordStudies, writeWordStudies, searchWordStudies
} from './word-studies.mjs';

const record = (overrides = {}) => ({
  id: 'word-study-1',
  strongsId: 'G3056',
  englishWord: 'word',
  lemma: 'λόγος',
  transliteration: 'logos',
  partOfSpeech: 'Noun',
  gloss: 'word; message',
  senses: [{ gloss: 'word', definition: 'A spoken or written expression.' }],
  originalText: 'λόγον',
  wordStart: 18,
  wordEnd: 23,
  language: 'Greek',
  parsing: 'N-ASM',
  parsingFull: 'Noun - Accusative Singular Masculine',
  reference: { book: 'John', chapter: 1, verse: 1, translation: 'BSB' },
  verseText: 'In the beginning was the Word.',
  source: 'STEPBible Brief Lexicon',
  sourceUrl: 'https://www.stepbible.org/',
  notes: 'Observe how the term functions in context.',
  createdAt: '2026-11-17T08:00:00.000Z',
  updatedAt: '2026-11-17T08:05:00.000Z',
  ...overrides
});

test('accepts a complete source-attributed word study', () => {
  assert.equal(isWordStudyRecord(record()), true);
});

test('rejects malformed Strong IDs, passages, dates and unsafe source URLs', () => {
  assert.equal(isWordStudyRecord(record({ strongsId: 'X3056' })), false);
  assert.equal(isWordStudyRecord(record({ reference: { book: 'John', chapter: 22, verse: 1, translation: 'BSB' } })), false);
  assert.equal(isWordStudyRecord(record({ updatedAt: 'not-a-date' })), false);
  assert.equal(isWordStudyRecord(record({ sourceUrl: 'javascript:alert(1)' })), false);
  assert.equal(isWordStudyRecord(record({ wordStart: 18 })), false);
  assert.equal(isWordStudyRecord(record({ wordStart: 23, wordEnd: 18 })), false);
});

test('normalizes duplicate IDs and sorts newest revisions first', () => {
  const older = record({ id: 'older', updatedAt: '2026-11-16T08:00:00.000Z' });
  const normalized = normalizeWordStudies([older, record(), record()]);
  assert.deepEqual(normalized.map(item => item.id), ['word-study-1', 'older']);
});

test('reads and writes the dedicated browser storage key', () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); }
  };
  assert.equal(writeWordStudies([record()], storage), true);
  assert.equal(values.has(WORD_STUDIES_STORAGE_KEY), true);
  assert.deepEqual(readWordStudies(storage), [record()]);
});

test('malformed local JSON is treated as an empty collection', () => {
  const storage = { getItem() { return '{'; } };
  assert.deepEqual(readWordStudies(storage), []);
});

test('searches the verse, Strong ID, lemma, morphology and researcher notes', () => {
  const records = [record()];
  assert.equal(searchWordStudies(records, 'John 1:1').length, 1);
  assert.equal(searchWordStudies(records, 'G3056').length, 1);
  assert.equal(searchWordStudies(records, 'λόγος').length, 1);
  assert.equal(searchWordStudies(records, 'Accusative').length, 1);
  assert.equal(searchWordStudies(records, 'functions in context').length, 1);
  assert.equal(searchWordStudies(records, 'not-present').length, 0);
});

test('keeps repeated Strong’s entries from distinct source offsets in one verse', () => {
  const first = record({ id: 'first-occurrence', wordStart: 8, wordEnd: 13 });
  const second = record({ id: 'second-occurrence', wordStart: 24, wordEnd: 29 });
  const normalized = normalizeWordStudies([first, second]);
  assert.equal(normalized.length, 2);
  assert.deepEqual(normalized.map(item => [item.wordStart, item.wordEnd]), [[8, 13], [24, 29]]);
});

test('preserves optional empty researcher notes', () => {
  assert.equal(isWordStudyRecord(record({ notes: '' })), true);
  assert.equal(normalizeWordStudies([record({ notes: '' })]).length, 1);
});
