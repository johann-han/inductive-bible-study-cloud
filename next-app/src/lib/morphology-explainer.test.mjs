import test from 'node:test';
import assert from 'node:assert/strict';
import { explainMorphology } from './morphology-explainer.mjs';

test('explains the supplied Greek verb parsing one term at a time', () => {
  const result = explainMorphology('Verb - Imperfect Indicative Active - 3d Person Singular');
  assert.deepEqual(result.map(item => item.title), ['Verb', 'Imperfect tense', 'Indicative mood', 'Active voice', 'Third person', 'Singular number']);
  assert.match(result.find(item => item.title === 'Imperfect tense').explanation, /past time/i);
  assert.match(result.find(item => item.title === 'Imperfect tense').explanation, /does not automatically mean uninterrupted action/i);
});

test('explains case, gender and number labels', () => {
  const result = explainMorphology('Noun - Nominative Masculine Singular');
  assert.deepEqual(result.map(item => item.title), ['Noun', 'Nominative case', 'Masculine gender', 'Singular number']);
});

test('explains Hebrew stems without treating them as Greek tense labels', () => {
  const result = explainMorphology('Verb - Hiphil Perfect 3rd Person Masculine Singular', 'Hebrew');
  assert.ok(result.some(item => item.title === 'Hiphil stem'));
  assert.ok(result.some(item => item.title === 'Perfect form'));
  assert.ok(result.some(item => item.title === 'Third person'));
});

test('returns no fabricated explanation for unknown parsing text', () => {
  assert.deepEqual(explainMorphology('Unclassified XYZ'), []);
});
