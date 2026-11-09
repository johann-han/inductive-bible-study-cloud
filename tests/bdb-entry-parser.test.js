'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBdbEntryHtml, normalizeBdbStrongs } = require('../lib/bdb-entry-parser');

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
  assert.equal(entry.primaryStrongId, 'H3068');
  assert.deepEqual(entry.additionalStrongIds, ['H3069', 'H0430']);
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
  assert.equal(entry.primaryStrongId, 'H0120');
  assert.deepEqual(entry.additionalStrongIds, ['H0121']);
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
  assert.equal(first.primaryStrongId, 'H1254');
  assert.equal(second.primaryStrongId, 'H1254');
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
