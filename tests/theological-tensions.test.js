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
