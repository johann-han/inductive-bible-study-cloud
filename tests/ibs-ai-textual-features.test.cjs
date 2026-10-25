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


test('linking-word guidance distinguishes genuine connectors from negation and directive words', () => {
  assert.match(html, /Before classifying anything as a linking word, verify that it actually connects clauses, propositions, or ideas/);
  assert.match(html, /negators such as “not,” imperatives or directive verbs such as “let,” articles, auxiliaries, and ordinary content words are not linking words merely because they affect meaning/);
  assert.match(html, /If no genuine connector is present, say so rather than filling the list/);
  assert.match(html, /Do not mistake negation \(for example, “not”\) or a directive verb \(for example, “let”\) for a linking word/);
});

test('initial analysis excludes non-connectors from the Linking Words list and verifies quotations', () => {
  assert.match(html, /STRICT OUTPUT RULE: The 'Linking Words' section may contain only words that demonstrably connect two clauses/);
  assert.match(html, /Do not include a non-connector as a numbered linking-word entry/);
  assert.match(html, /Put negation such as “not” under Textual Observations, not Linking Words/);
  assert.match(html, /Verify each quotation character-for-character against the selected translation/);
  assert.match(html, /lest any man should boast/);
  assert.match(html, /let no man should boast/);
});

test('initial selected-verse study prompt requests contextual keyword and linking-word analysis', () => {
  assert.match(html, /Make this first analysis examine the passage’s significant keywords and linking words/);
  assert.match(html, /For each significant linking word actually present, quote it with its verse/);
  assert.match(html, /classify its contextual function using the ten linking-word categories/);
  assert.match(html, /Do not invent words or force categories/);
  assert.match(html, /or jump directly to life application/);
});

test('default Analyze My Notes action begins with contextual keyword and linking-word analysis', () => {
  assert.match(html, /data-prompt="Analyse the selected passage’s significant keywords and linking words as the first study analysis/);
  assert.match(html, /identify the clauses or ideas it connects/);
  assert.match(html, /classify its contextual function using my ten linking-word categories/);
  assert.match(html, /Do not jump to life application unless I ask for it/);
});

test('AI original-language guidance forbids invented Greek/Hebrew definitions or morphology', () => {
  assert.match(html, /Discuss Greek or Hebrew definitions, Strong’s entries, or morphology only when reliable original-language data is actually available in the study context/);
  assert.match(html, /never invent a definition, grammatical form, or lexical claim/);
});


test('server-wide AI mentor prompt requires contextual connector analysis and the full taxonomy', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /For each genuine significant connector, explicitly quote the exact word or phrase and verse/);
  assert.match(server, /Before listing a word under 'Linking Words,' verify from the supplied verse wording that it actually links two clauses, propositions, or ideas/);
  assert.match(server, /'not' is a negator and 'let' is usually a directive verb, not a connector/);
  assert.match(server, /do not misquote 'lest' as 'let'/);
  assert.match(server, /If the passage has no significant connectors, say so rather than filling the list/);
  assert.match(server, /identify the exact clauses or ideas it connects/);
  assert.match(server, /advances the .* argument and affects interpretation/);
  assert.match(server, /CAUSE \/ REASON \(because, for this reason, since, that\)/);
  assert.match(server, /COMPARISON \(as, also, just as, like, likewise, more, more than, so as, so also, too\)/);
  assert.match(server, /CONTINUATION \(and, either, neither, nor, or\)/);
  assert.match(server, /PURPOSE \/ RESULT \(for this purpose, in order that, so that, that, then, therefore, thus\)/);
  assert.match(server, /candidate categories, not automatic labels/);
  assert.match(server, /never invent occurrences or overstate uncertain links/);
});
