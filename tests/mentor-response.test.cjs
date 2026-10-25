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
  assert.match(output, /4\. \*\*Created\*\*/);
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
  assert.match(output, /3\. Therefore/);
  assert.match(output, /Keep this section/);
});
