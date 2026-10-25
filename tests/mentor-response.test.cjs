const assert = require('node:assert/strict');
const test = require('node:test');
const { removeNonConnectorEntries } = require('../mentor-response');

test('removes a numbered Not entry and its explanatory continuation only from Linking Words', () => {
  const input = [
    '## Textual Observations',
    '3. “Not” is a negation that contrasts works with grace.',
    '',
    '## Linking Words',
    '1. **For** — introduces the reason.',
    '2. **That** — introduces the purpose.',
    '3. **“Not” (Ephesians 2:9)**',
    '   This negates “of works”; it does not connect two clauses.',
    '4. **Created** — describes the result.',
    '',
    '## Interpretation',
    'The negation is important to Paul’s argument.'
  ].join('\n');

  const output = removeNonConnectorEntries(input);
  assert.match(output, /Textual Observations[\s\S]*“Not” is a negation/);
  assert.match(output, /1\. \*\*For\*\*/);
  assert.match(output, /2\. \*\*That\*\*/);
  assert.doesNotMatch(output, /3\. \*\*“Not” \(Ephesians 2:9\)\*\*/);
  assert.doesNotMatch(output, /This negates “of works”/);
  assert.doesNotMatch(output, /Created/);
  assert.match(output, /## Interpretation[\s\S]*The negation is important/);
});

test('leaves genuine linking-word entries and other sections unchanged when no Not item exists', () => {
  const input = [
    '## Linking Words',
    '1. **For** — gives the reason.',
    '2. **That** — introduces purpose.',
    '## Textual Observations',
    '“Not” is a negation, not a connector.'
  ].join('\n');
  assert.equal(removeNonConnectorEntries(input), input);
});

test('supports unbolded and quoted Not entry titles', () => {
  const input = [
    '### Linking Words',
    '1. For — gives a reason.',
    '2. Not — negates “of works”.',
    '   It does not connect clauses.',
    '3. Therefore — introduces a result.',
    '### Notes',
    'Keep this section.'
  ].join('\n');
  const output = removeNonConnectorEntries(input);
  assert.doesNotMatch(output, /^2\. Not/m);
  assert.doesNotMatch(output, /It does not connect clauses/);
  assert.match(output, /2\. Therefore/);
  assert.match(output, /Keep this section/);
});


test('renumbers all remaining entries consecutively after removing Not', () => {
  const input = [
    '## Linking Words',
    '1. **For** — reason.',
    '2. **And** — addition.',
    '3. **Not** — negation, not a connector.',
    '4. **Lest** — purpose.',
    '5. **For** — reason.',
    '## Interpretation',
    'Keep interpretation numbering untouched: 4. Example.'
  ].join('\n');
  const output = removeNonConnectorEntries(input);
  assert.match(output, /1\. \*\*For\*\*/);
  assert.match(output, /2\. \*\*And\*\*/);
  assert.match(output, /3\. \*\*Lest\*\*/);
  assert.match(output, /4\. \*\*For\*\*/);
  assert.doesNotMatch(output, /5\. \*\*For\*\*/);
  assert.match(output, /Keep interpretation numbering untouched: 4\. Example\./);
});

test('removes a standalone Let imperative from Linking Words but preserves it elsewhere', () => {
  const input = [
    '## Linking Words',
    '1. **And** — joins the clauses.',
    '2. **Let** — directs the reader to act.',
    '   This is an imperative, not a connective relationship.',
    '3. **Lest** — introduces a purpose clause.',
    '## Textual Observations',
    '“Let” is an imperative in this sentence.',
    '## Interpretation',
    'Keep this interpretation.'
  ].join('\n');
  const output = removeNonConnectorEntries(input);
  assert.match(output, /1\. \*\*And\*\*/);
  assert.doesNotMatch(output, /^2\. \*\*Let\*\*/m);
  assert.doesNotMatch(output, /This is an imperative/);
  assert.match(output, /2\. \*\*Lest\*\*/);
  assert.match(output, /Textual Observations[\s\S]*“Let” is an imperative/);
  assert.match(output, /Keep this interpretation/);
});
