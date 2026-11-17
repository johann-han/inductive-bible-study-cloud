import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComparisonPassageImport } from '../next-app/src/lib/theological-tensions.mjs';

test('comparison passage import retains its reference, exact text and translation source', () => {
  assert.deepEqual(buildComparisonPassageImport({
    reference: 'John 1:1-3',
    text: '1. In the beginning was the Word. 2. He was with God.',
    source: 'Berean Standard Bible'
  }), {
    reference: 'John 1:1-3',
    context: '1. In the beginning was the Word. 2. He was with God.\n\nText source: Berean Standard Bible'
  });
});

test('comparison passage import trims surrounding whitespace and permits an absent source label', () => {
  assert.deepEqual(buildComparisonPassageImport({
    reference: '  Romans 8  ',
    text: '  There is therefore now no condemnation.  '
  }), { reference: 'Romans 8', context: 'There is therefore now no condemnation.' });
});

test('comparison passage import rejects missing or incomplete comparison data', () => {
  assert.throws(() => buildComparisonPassageImport(null), /comparison result is required/);
  assert.throws(() => buildComparisonPassageImport({ text: 'Verse text' }), /Scripture reference/);
  assert.throws(() => buildComparisonPassageImport({ reference: 'John 1' }), /Scripture text/);
});


import {
  listTheologicalTensionRecords,
  filterTheologicalTensionRecords
} from '../next-app/src/lib/theological-tensions.mjs';

const sampleTensions = {
  'Genesis|1::god creates': [
    {
      id: 'gen-1', passageA: 'Genesis 1:1', contextA: 'Creation account',
      passageB: 'John 1:1', contextB: 'Prologue',
      issue: 'Creation and the Word', analysis: 'Comparison still open',
      uncertainty: 'Historical setting', assessment: 'apparent_tension',
      status: 'under_review', updatedAt: '2026-11-16T10:00:00Z'
    }
  ],
  'Romans|3::justification': [
    {
      id: 'rom-1', passageA: 'Romans 3:28', contextA: 'Paul on works of law',
      passageB: 'James 2:24', contextB: 'James on works',
      issue: 'Faith and works', analysis: 'Need to compare usage',
      uncertainty: '', assessment: 'unresolved',
      status: 'open', updatedAt: '2026-11-17T10:00:00Z'
    },
    { id: '', issue: 'invalid row' }
  ],
  malformed: 'not-an-array'
};

test('study-wide tension index retains claim and passage identity and sorts newest first', () => {
  const rows = listTheologicalTensionRecords(sampleTensions);
  assert.deepEqual(rows.map(row => row.id), ['rom-1', 'gen-1']);
  assert.equal(rows[0].studyKey, 'Romans|3');
  assert.equal(rows[0].studyPassage, 'Romans 3');
  assert.equal(rows[0].claimKey, 'justification');
  assert.equal(rows[1].reviewKey, 'Genesis|1::god creates');
});

test('study-wide tension index safely handles malformed or empty storage values', () => {
  assert.deepEqual(listTheologicalTensionRecords(null), []);
  assert.deepEqual(listTheologicalTensionRecords([]), []);
  assert.deepEqual(listTheologicalTensionRecords({ 'John|1::word': [null, {}, { id: 4 }] }), []);
});

test('tension filters can combine assessment, status and free-text search', () => {
  const rows = listTheologicalTensionRecords(sampleTensions);
  assert.deepEqual(
    filterTheologicalTensionRecords(rows, { assessment: 'unresolved', status: 'open', search: 'James 2:24' }).map(row => row.id),
    ['rom-1']
  );
  assert.deepEqual(
    filterTheologicalTensionRecords(rows, { assessment: 'apparent_tension' }).map(row => row.id),
    ['gen-1']
  );
  assert.deepEqual(
    filterTheologicalTensionRecords(rows, { search: 'creation account' }).map(row => row.id),
    ['gen-1']
  );
});

test('tension filters return no entries for unmatched criteria and ignore malformed inputs', () => {
  const rows = listTheologicalTensionRecords(sampleTensions);
  assert.deepEqual(filterTheologicalTensionRecords(rows, { status: 'researcher_resolved' }), []);
  assert.deepEqual(filterTheologicalTensionRecords(null), []);
});
