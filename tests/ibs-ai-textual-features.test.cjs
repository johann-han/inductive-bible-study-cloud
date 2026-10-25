const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('AI stage review explicitly examines keywords and linking words in context', () => {
  assert.match(html, /const textualFeaturesGuidance = '[^']*significant and repeated keywords and the passage’s linking words/);
  assert.match(html, /do not merely list linking words or give generic definitions/);
  assert.match(html, /identify the exact clause, statement, reason, result, contrast, purpose, or inference it connects/);
  assert.match(html, /explain its grammatical\/discourse function in this sentence/);
  assert.match(html, /explain how that connection advances the author’s argument in context/);
  assert.match(html, /state the interpretive consequence, grounded in the wording/);
  assert.match(html, /Analyse only connectors actually present in the supplied passage and translation/);
  assert.match(html, /askMentor\(sectionPrompts\[activeSection\] \+ textualFeaturesGuidance\)/);
});

test('AI original-language guidance forbids invented Greek/Hebrew definitions or morphology', () => {
  assert.match(html, /Discuss Greek or Hebrew definitions, Strong’s entries, or morphology only when reliable original-language data is actually available in the study context/);
  assert.match(html, /never invent a definition, grammatical form, or lexical claim/);
});
