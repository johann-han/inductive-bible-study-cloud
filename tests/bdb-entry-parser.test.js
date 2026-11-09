'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBdbEntryHtml, parseBdbEntryJson, parseBdbMappingCsv, normalizeBdbStrongs } = require('../lib/bdb-entry-parser');

test('normalizes BDB Strong\'s identifiers without guessing the language', () => {
  assert.equal(normalizeBdbStrongs('H430'), 'H0430');
  assert.equal(normalizeBdbStrongs('G26'), 'G0026');
  assert.equal(normalizeBdbStrongs('H1254A'), 'H1254');
  assert.equal(normalizeBdbStrongs('not-a-number'), null);
});

test('parses a primary Hebrew headword and its first Strong\'s mapping', () => {
  const html = `
    <h1><entry>BDB430</entry> [<entry onclick="sn('H430')">H430</entry>]</h1>
    <language>Biblical Hebrew</language>
    <p><bdbheb>אֱלֹהִים</bdbheb><pos>noun masculine plural</pos><primary>God</primary></p>
  `;
  assert.deepEqual(parseBdbEntryHtml(html), {
    entryId: 'BDB430',
    language: 'hebrew',
    lemma: 'אֱלֹהִים',
    partOfSpeech: 'noun masculine plural',
    primaryGloss: 'God',
    headingStrongIds: ['H0430'],
    primaryStrongId: 'H0430',
    additionalStrongIds: [],
    needsEditorialCheck: false
  });
});

test('does not mistake Strong\'s references in an article heading for the primary mapping', () => {
  const html = `
    <h1><entry>BDB2100</entry> [<entry onclick="sn('H3068')">H3068</entry>
      <entry onclick="sn('H3069')">H3069</entry><entry onclick="sn('H430')">H430</entry>]</h1>
    <language>Biblical Hebrew</language>
    <p><bdbheb>יהוה</bdbheb><pos>proper name</pos><primary>Yahweh</primary></p>
  `;
  const entry = parseBdbEntryHtml(html);
  assert.deepEqual(entry.headingStrongIds, ['H3068', 'H3069', 'H0430']);
  assert.equal(Object.hasOwn(entry, 'primaryStrongId'), false);
  assert.equal(entry.lemma, 'יהוה');
});

test('preserves multiple Strong\'s identifiers attached to one headword', () => {
  const html = `
    <h1><entry>BDB108</entry> [<entry onclick="sn('H120')">H120</entry>
      <entry onclick="sn('H121')">H121</entry>]</h1>
    <language>Biblical Hebrew</language>
    <p><bdbheb>אָדָם</bdbheb><pos>noun masculine</pos><primary>man, mankind</primary></p>
  `;
  const entry = parseBdbEntryHtml(html);
  assert.deepEqual(entry.headingStrongIds, ['H0120', 'H0121']);
  assert.equal(Object.hasOwn(entry, 'primaryStrongId'), false);
});

test('keeps homonymous BDB articles separate even when they share a Strong\'s number', () => {
  const create = `
    <h1><entry>BDB1300</entry> [<entry onclick="sn('H1254')">H1254</entry>]</h1>
    <language>Biblical Hebrew</language>
    <p><bdbheb>בָּרָא</bdbheb><pos>verb</pos><primary>shape, create</primary></p>
  `;
  const beFat = `
    <h1><entry>BDB1303</entry> [<entry onclick="sn('H1254')">H1254</entry>]</h1>
    <language>Biblical Hebrew</language>
    <p><bdbheb>בָּרָא</bdbheb><pos>verb</pos><primary>be fat</primary></p>
  `;
  const first = parseBdbEntryHtml(create);
  const second = parseBdbEntryHtml(beFat);
  assert.deepEqual(first.headingStrongIds, ['H1254']);
  assert.deepEqual(second.headingStrongIds, ['H1254']);
  assert.notEqual(first.entryId, second.entryId);
  assert.notEqual(first.primaryGloss, second.primaryGloss);
});

test('identifies Biblical Aramaic entries and editorial-check markers', () => {
  const html = `
    <h1><entry>BDB9264</entry> [<entry onclick="sn('H3')">H3</entry>]</h1>
    <language>Biblical Aramaic</language>
    <p><bdbarc>אֱלָהּ</bdbarc><pos>noun</pos><primary>God</primary></p>
    <checkingNeeded />
  `;
  const entry = parseBdbEntryHtml(html);
  assert.equal(entry.language, 'aramaic');
  assert.equal(entry.lemma, 'אֱלָהּ');
  assert.equal(entry.needsEditorialCheck, true);
});

test('rejects HTML without a BDB entry heading', () => {
  assert.equal(parseBdbEntryHtml('<p>not a BDB entry</p>'), null);
});


test('parses structured BDB JSON while preserving separate sense records', () => {
  const entry = parseBdbEntryJson('BDB108', {
    head_word: 'אָדָם',
    pos: 'noun masculine',
    primary: 'man, mankind',
    description: 'human being',
    senses: [
      { number: 1, primary: null, description: 'human being' },
      { number: 3, primary: 'Adam', description: 'first man' }
    ]
  });
  assert.equal(entry.entryId, 'BDB108');
  assert.equal(entry.lemma, 'אָדָם');
  assert.equal(entry.primaryGloss, 'man, mankind');
  assert.equal(entry.senses.length, 2);
  assert.equal(entry.senses[1].primary, 'Adam');
});

test('parses BDB mapping CSV as unverified references, never primary Strong\'s mappings', () => {
  const csv = 'bdb,strongs,LemmaGuess\\nBDB2100,H3068,יהוה\\nBDB2100,H3069,יהוה\\nBDB2100,H0430,יהוה\\nBDB108,H0120,אָדָם';
  const rows = parseBdbMappingCsv(csv);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.filter(row => row.entryId === 'BDB2100').map(row => row.strongsId), ['H3068', 'H3069', 'H0430']);
  assert.ok(rows.every(row => row.classification === 'unverified-reference'));
  assert.equal(rows.some(row => Object.hasOwn(row, 'primaryStrongId')), false);
});

test('rejects invalid BDB JSON identifiers and malformed CSV headers', () => {
  assert.equal(parseBdbEntryJson('H0430', { head_word: 'אֱלֹהִים' }), null);
  assert.deepEqual(parseBdbMappingCsv('entry,strongs,lemma'), []);
});
