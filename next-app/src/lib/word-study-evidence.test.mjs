import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWordStudyEvidenceDraft } from './word-study-evidence.mjs';

const record = {
  id: 'word-1', strongsId: 'G3056', englishWord: 'Word', lemma: 'λόγος',
  transliteration: 'logos', partOfSpeech: 'Noun', gloss: 'word; message',
  senses: [{ gloss: 'word', definition: 'A spoken expression.' }],
  originalText: 'λόγον', wordStart: 12, wordEnd: 17,
  language: 'Greek', parsing: 'N-ASM', parsingFull: 'Noun - Accusative Singular Masculine',
  reference: { book: 'John', chapter: 1, verse: 1, translation: 'BSB' },
  verseText: 'In the beginning was the Word.',
  source: 'STEPBible Brief Lexicon', sourceUrl: 'https://www.stepbible.org/',
  notes: 'Observe the term in the prologue.'
};

test('converts a saved word study into a fully attributed evidence draft', () => {
  const draft = buildWordStudyEvidenceDraft(record);
  assert.equal(draft.kind, 'Lexicon / Strong’s');
  assert.equal(draft.reference, 'G3056 · John 1:1 · Word');
  assert.equal(draft.source, record.source);
  assert.equal(draft.sourceUrl, record.sourceUrl);
  assert.equal(draft.sourceId, 'G3056');
  for (const text of ['λόγος', 'λόγον', 'Noun - Accusative Singular Masculine', 'word; message', 'John 1:1', 'Observe the term']) {
    assert.ok(draft.detail.includes(text), 'expected evidence detail to include ' + text);
  }
});

test('retains sense definitions and source verse wording in evidence detail', () => {
  const draft = buildWordStudyEvidenceDraft(record);
  assert.ok(draft.detail.includes('A spoken expression.'));
  assert.ok(draft.detail.includes('In the beginning was the Word.'));
});

test('does not invent source URLs or occurrence offsets when they are absent', () => {
  const { sourceUrl, ...withoutUrl } = record;
  delete withoutUrl.wordStart;
  delete withoutUrl.wordEnd;
  const draft = buildWordStudyEvidenceDraft(withoutUrl);
  assert.equal(Object.hasOwn(draft, 'sourceUrl'), false);
  assert.ok(!draft.detail.includes('Word offsets in source verse'));
});

test('rejects missing word-study identity', () => {
  assert.throws(() => buildWordStudyEvidenceDraft(null), /saved word study/);
});
