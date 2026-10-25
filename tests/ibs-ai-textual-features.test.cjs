const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('AI stage review explicitly examines keywords and linking words in context', () => {
  assert.match(html, /const textualFeaturesGuidance = '[^']*do not merely list linking words or give generic definitions/);
  assert.match(html, /do not merely list linking words or give generic definitions/);
  assert.match(html, /identify the exact clause, statement, reason, result, contrast, purpose, or inference it connects/);
  assert.match(html, /explain its grammatical\/discourse function in this sentence/);
  assert.match(html, /explain how that connection advances the author’s argument in context/);
  assert.match(html, /state the interpretive consequence, grounded in the wording/);
  assert.match(html, /Analyse only connectors actually present in the supplied passage and translation/);
  assert.match(html, /CAUSE \/ REASON \(because, for this reason, since, that\)/);
  assert.match(html, /COMPARISON \(as, also, just as, like, likewise, more, more than, so as, so also, too\)/);
  assert.match(html, /CONTINUATION \(and, either, neither, nor, or\)/);
  assert.match(html, /CONTRAST \(although, but, except, even though, however, much more, nevertheless, only, otherwise, whereas, yet\)/);
  assert.match(html, /PURPOSE \/ RESULT \(for this purpose, in order that, so that, that, then, therefore, thus\)/);
  assert.match(html, /explicitly name the relationship category and justify that classification from the passage/);
  assert.match(html, /askMentor\(sectionPrompts\[activeSection\] \+ textualFeaturesGuidance\)/);
});

test('AI original-language guidance forbids invented Greek/Hebrew definitions or morphology', () => {
  assert.match(html, /Discuss Greek or Hebrew definitions, Strong’s entries, or morphology only when reliable original-language data is actually available in the study context/);
  assert.match(html, /never invent a definition, grammatical form, or lexical claim/);
});
