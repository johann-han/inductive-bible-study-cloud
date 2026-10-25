const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('AI stage review explicitly examines keywords and linking words in context', () => {
  assert.match(html, /const textualFeaturesGuidance = '[^']*significant and repeated keywords and the passage’s linking words/);
  assert.match(html, /Explain what each important connector links and how that relationship shapes the argument or meaning in this specific context/);
  assert.match(html, /askMentor\(sectionPrompts\[activeSection\] \+ textualFeaturesGuidance\)/);
});

test('AI original-language guidance forbids invented Greek/Hebrew definitions or morphology', () => {
  assert.match(html, /Discuss Greek or Hebrew definitions, Strong’s entries, or morphology only when reliable original-language data is actually available in the study context/);
  assert.match(html, /never invent a definition, grammatical form, or lexical claim/);
});
