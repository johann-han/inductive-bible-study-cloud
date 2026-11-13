import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STANDARD_XREF_SOURCE, getStandardCrossReferences, loadStandardCrossReferences,
  parseStandardCrossReferenceTsv, parseStandardReference
} from './standard-cross-references.mjs';

test('records the upstream source and CC BY 4.0 attribution', () => {
  assert.equal(STANDARD_XREF_SOURCE.license, 'CC BY 4.0');
  assert.match(STANDARD_XREF_SOURCE.attribution, /CrossReferences.org/);
});

test('parses common canonical and abbreviated references including ranges', () => {
  assert.deepEqual(parseStandardReference('Gen 1:1'), { book: 'Genesis', chapter: 1, verse: 1, endVerse: 1, label: 'Gen 1:1' });
  assert.deepEqual(parseStandardReference('1 Cor 13:4-7'), { book: '1 Corinthians', chapter: 13, verse: 4, endVerse: 7, label: '1 Cor 13:4-7' });
  assert.equal(parseStandardReference('Rev 23:1'), null);
  assert.equal(parseStandardReference('NotABook 1:1'), null);
  assert.equal(parseStandardReference('Phlm 1:1')?.book, 'Philemon');
});

test('parses phrase-anchored TSV rows and filters by passage or verse', () => {
  const rows = parseStandardCrossReferenceTsv([
    'Gen\t1\t1\tbeginning\tProv 8:22-24|John 1:1-3',
    'Gen\t1\t2\tformless\tJer 4:23',
    'Rom\t8\t28\twork together\tGen 50:20'
  ].join('\n'));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0].references.map(item => item.label), ['Prov 8:22-24', 'John 1:1-3']);
  assert.equal(getStandardCrossReferences(rows, { book: 'Genesis', chapter: 1 }).length, 2);
  assert.equal(getStandardCrossReferences(rows, { book: 'Genesis', chapter: 1, verse: 2 }).length, 1);
  assert.equal(parseStandardCrossReferenceTsv(['Gen\t1\t1\tbeginning\tJohn 1:1','Rom\t8\t28\twork together\tGen 50:20'].join('\n'), { book: 'Genesis', chapter: 1 }).length, 1);
});

test('loads and parses upstream data through an injectable fetcher', async () => {
  const rows = await loadStandardCrossReferences('BSB', { fetcher: async url => ({
    ok: true, text: async () => 'Gen\t1\t1\tbeginning\tJohn 1:1'
  })});
  assert.equal(rows[0].book, 'Genesis');
});
