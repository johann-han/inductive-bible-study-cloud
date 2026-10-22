const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.join(__dirname, '..', 'sermon', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(script => script.trim());

test('all inline JavaScript blocks parse without syntax errors', () => {
  assert.ok(inlineScripts.length >= 1, 'expected inline application scripts');
  inlineScripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source, { filename: `sermon-inline-${index + 1}.js` }));
  });
});

test('each AI workflow includes the matching imported-study context', () => {
  for (const profile of ['exegesis', 'bigIdea', 'outline', 'applications', 'manuscript']) {
    assert.ok(
      html.includes(`getInductiveStudyPromptContext('${profile}')`),
      `${profile} prompt should use the imported IBS packet`
    );
  }
});

test('the source context keeps Observe, Interpretation, Doctrine, and Discipleship separate', () => {
  for (const label of ['IBS Observe', 'IBS Interpretation', 'IBS Doctrine', 'IBS Discipleship']) {
    assert.ok(html.includes(label), `missing distinct source section: ${label}`);
  }
  assert.ok(html.includes('IBS personal cross-references (user-created)'));
  assert.ok(html.includes('IBS standard cross-references'));
  assert.ok(html.includes('licence:'));
});

test('AI generation asks before replacing existing sermon fields', () => {
  assert.equal((html.match(/confirmAIFieldOverwrite\(\[/g) || []).length, 5);
  assert.ok(html.includes('window.confirm('));
  assert.ok(html.includes('The imported Inductive Study source packet itself will remain unchanged.'));
});

test('outline and application prompts preserve the study-to-sermon distinctions', () => {
  assert.ok(html.includes('not automatically the homiletical outline'));
  assert.ok(html.includes('Do not move directly from observation to application.'));
  assert.ok(html.includes('the Discipleship notes as if they were already three audience-specific lists'));
});

test('import validation and safe source rendering remain in place', () => {
  assert.ok(html.includes('normalizeInductiveStudyPacket'));
  assert.ok(html.includes('renderInductiveStudySource()'));
  assert.ok(html.includes('pre.textContent=text'));
});

test('imported cross-reference panels render readable verse references instead of raw JSON', () => {
  const helperStart = html.indexOf('function formatCrossReferencePoint(point, isSource = false) {');
  const helperEnd = html.indexOf('        /**\n         * Main Application Controller for Expository Sermon Prep', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart, 'expected the cross-reference display formatters');
  const helperSource = html.slice(helperStart, helperEnd);
  const sandbox = {};
  vm.runInNewContext(
    helperSource + '\nthis.formatPersonal = formatPersonalCrossReferences; this.formatStandard = formatStandardCrossReferences;',
    sandbox
  );

  const personal = sandbox.formatPersonal([{
    source: { book: 'Romans', chapter: 2, verse: 14 },
    target: { book: 'Ephesians', chapter: 2, startVerse: 12, endVerse: 13 },
    relation: 'theme',
    note: 'Compare the argument'
  }]);
  assert.ok(personal.includes('Romans 2:14 → Ephesians 2:12–13'));
  assert.ok(personal.includes('Relationship: theme'));
  assert.ok(personal.includes('Note: Compare the argument'));
  assert.ok(!personal.includes('"source"') && !personal.includes('"target"'));

  const standard = sandbox.formatStandard({
    available: true,
    note: 'TSK-derived cross-reference dataset',
    entries: [
      { verse: 1, anchors: [
        { anchor: 'Therefore', references: ['Rom 1:18-20', 'Rom 3:9'] },
        { anchor: 'O man', references: ['Rom 2:3', 'Rom 9:20', '1 Cor 7:16'] }
      ] },
      { verse: 2, anchors: [{ anchor: 'judgment', references: ['John 5:24'] }] }
    ]
  });
  assert.ok(standard.includes('Availability: Available'));
  assert.ok(standard.includes('Source note: TSK-derived cross-reference dataset'));
  assert.ok(standard.includes('Verse 1'));
  assert.ok(standard.includes('“Therefore”: Rom 1:18-20; Rom 3:9'));
  assert.ok(standard.includes('“O man”: Rom 2:3; Rom 9:20; 1 Cor 7:16'));
  assert.ok(standard.includes('Verse 2'));
  assert.ok(!standard.includes('"anchors"') && !standard.includes('"references"'));

  const bounded = sandbox.formatStandard({
    available: true,
    entries: Array.from({ length: 65 }, (_, index) => ({
      verse: index + 1,
      anchors: [{ anchor: 'Anchor ' + (index + 1), references: ['John 1:1'] }]
    }))
  });
  assert.ok(bounded.includes('5 additional verse groups not shown.'));
  assert.ok(!bounded.includes('Verse 61'));

  assert.ok(html.includes("formatPersonalCrossReferences(packet.customCrossReferences)"));
  assert.ok(html.includes("formatStandardCrossReferences(std)"));
  assert.ok(!html.includes("if(packet.customCrossReferences.length)addDetails('My Cross-References · personal links ('+packet.customCrossReferences.length+')',JSON.stringify(packet.customCrossReferences,null,2))"));
  assert.ok(!html.includes("JSON.stringify(std.entries,null,2)"));
  assert.ok(html.includes('pre.textContent=text'), 'render formatted strings as text, not markup');
});

test('browser-side Gemini key handling has not returned', () => {
  assert.ok(!html.includes('generativelanguage.googleapis.com'));
  assert.ok(!html.includes('kerygma_gemini_api_key'));
  assert.ok(html.includes("fetch('/api/sermon-ai'"));
});


const serverPath = path.join(__dirname, '..', 'server.js');
const serverSource = fs.readFileSync(serverPath, 'utf8');

test('Kerygma server supports Gemini or OpenRouter without exposing provider secrets', () => {
  assert.ok(serverSource.includes("openrouterConfigured: !!process.env.OPENROUTER_API_KEY"));
  assert.ok(serverSource.includes("aiConfigured: Boolean(aiProvider)"));
  assert.ok(serverSource.includes("if (hasGemini)"));
  assert.ok(serverSource.includes("if (!hasGemini && !hasOpenRouter)"));
  assert.ok(serverSource.includes("fetch('https://openrouter.ai/api/v1/chat/completions'"));
  assert.ok(serverSource.includes("fetch(apiUrl"));
  assert.ok(serverSource.includes("authorizeAIMentor(req)"));
  assert.ok(serverSource.includes("consumeAIRateLimit('sermon:' + identity.userId)"));
  assert.ok(!serverSource.includes("OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY"));
  assert.ok(!html.includes("OPENROUTER_API_KEY="));
});

test('OpenRouter schema converter maps Gemini-style uppercase types to strict JSON Schema', () => {
  const start = serverSource.indexOf('function toOpenRouterJsonSchema(');
  const end = serverSource.indexOf('const server = http.createServer', start);
  assert.ok(start >= 0 && end > start, 'expected provider-schema helpers in server.js');
  const helperSource = serverSource.slice(start, end);
  const sandbox = {};
  vm.runInNewContext(helperSource + '\nthis.helpers = { toOpenRouterJsonSchema, prepareOpenRouterResponseFormat };', sandbox);
  const converted = sandbox.helpers.toOpenRouterJsonSchema({
    type: 'OBJECT',
    properties: {
      context: { type: 'STRING' },
      keywords: { type: 'STRING' }
    },
    propertyOrdering: ['context', 'keywords']
  });
  assert.equal(converted.type, 'object');
  assert.deepEqual(JSON.parse(JSON.stringify(converted.required)), ['context', 'keywords']);
  assert.equal(converted.additionalProperties, false);
  assert.equal(converted.properties.context.type, 'string');
  assert.ok(!Object.hasOwn(converted, 'propertyOrdering'));
});

test('OpenRouter wraps a top-level array schema and preserves the browser array contract', () => {
  const start = serverSource.indexOf('function toOpenRouterJsonSchema(');
  const end = serverSource.indexOf('const server = http.createServer', start);
  const sandbox = {};
  vm.runInNewContext(serverSource.slice(start, end) + '\nthis.helpers = { prepareOpenRouterResponseFormat };', sandbox);
  const prepared = sandbox.helpers.prepareOpenRouterResponseFormat({
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        reference: { type: 'STRING' },
        statement: { type: 'STRING' },
        notes: { type: 'STRING' }
      },
      propertyOrdering: ['reference', 'statement', 'notes']
    }
  });
  assert.equal(prepared.unwrapArray, true);
  assert.equal(prepared.responseFormat.type, 'json_schema');
  assert.equal(prepared.responseFormat.json_schema.schema.type, 'object');
  assert.equal(prepared.responseFormat.json_schema.schema.properties.items.type, 'array');
  assert.deepEqual(
    JSON.parse(JSON.stringify(prepared.responseFormat.json_schema.schema.required)),
    ['items']
  );
});

test('Kerygma Guide is available as a separate contextual conversation', () => {
  for (const expected of [
    'id="kerygma-guide-launcher"',
    'id="kerygma-guide-panel"',
    'Kerygma Guide & Assistant',
    'id="kerygma-guide-messages"',
    'id="kerygma-guide-input"',
    'sermonApp.askKerygmaGuide()',
    'this.callSermonAI(systemPrompt, userQuery)',
    'getInductiveStudyPromptContext(stage.profile)',
    'Guide me through this step.',
    'Review my current work',
    'What is a sensible next step, and why?'
  ]) assert.ok(html.includes(expected), 'missing guide UI or behavior: ' + expected);
});

test('Kerygma Guide coaches the user without editing or persisting sermon fields', () => {
  assert.ok(html.includes('You are both a guide and an assistant, not merely a content generator.'));
  assert.ok(html.includes('Never claim to have edited or saved a sermon field.'));
  assert.ok(html.includes('Never automatically change title, Bible text, notes, Big Idea, outline, applications, manuscript, or the imported IBS source.'));
  assert.ok(html.includes('renderKerygmaGuideMarkdown(body, message.content)'));
  assert.ok(!html.includes('body.innerHTML = String(message.content ||'));
  assert.ok(html.includes('Never claim to have edited or saved a sermon field.'));
  assert.ok(html.includes("this.guideConversationSermonId !== s.id"));
  assert.ok(html.includes("this.activeWorkflowTab = tabKey"));
  assert.ok(html.includes('this.guideHistory = this.guideHistory.slice(-12)'));
  assert.ok(html.includes('Kerygma sends your question and relevant sermon/source excerpts to the configured AI provider.'));
  assert.ok(html.includes('const requestedSermonId = sermon.id'));
  assert.ok(html.includes('this.currentSermonId !== requestedSermonId'));
  assert.ok(!html.includes("localStorage.setItem('kerygmaGuide"));

  const start = html.indexOf('async askKerygmaGuide() {');
  const end = html.indexOf('confirmAIFieldOverwrite(fields)', start);
  assert.ok(start >= 0 && end > start, 'expected the conversation-only guide method');
  const method = html.slice(start, end);
  assert.ok(!method.includes('saveToStorage('), 'guide must not persist changes to sermon data');
  assert.ok(!method.includes('updateMeta('), 'guide must not update sermon fields');
  assert.ok(!method.includes('sermon.manuscript ='), 'guide must not overwrite the manuscript');
});

test('Kerygma Guide gives a substantive chapter overview and continues with one focused question', () => {
  assert.ok(html.includes('When the passage selected for study is a whole chapter, orient the learner to the chapter'));
  assert.ok(html.includes('Usually aim for about 150–250 words'));
  assert.ok(html.includes('provide a useful overview of the chapter\'s main argument and a few major movements'));
  assert.ok(html.includes('invite the learner to begin with ONE question'));
  assert.ok(html.includes('If the user shares an answer, engage that answer directly'));
  assert.ok(html.includes('ask ONE focused follow-up question.'));
  assert.ok(html.includes('this.callSermonAI(systemPrompt, userQuery, null, 900)'));
});

test('Kerygma Guide lets the user explicitly request more questions or insights', () => {
  assert.ok(html.includes('>More questions</button>'));
  assert.ok(html.includes('>More insights</button>'));
  assert.ok(html.includes('Give me 5 additional, non-repetitive questions about the current passage and active study stage.'));
  assert.ok(html.includes('Give me 3–5 additional insights about the current passage and active study stage.'));
  assert.ok(html.includes('The one-question-at-a-time approach is only the default, not a restriction.'));
  assert.ok(html.includes('provide a useful set of the requested size'));
  assert.ok(html.includes('This default does not apply when the user explicitly asks for additional questions or insights'));
});

test('More Questions button inline click handler parses and calls the prompt setter', () => {
  const label = '>More questions</button>';
  const buttonEnd = html.indexOf(label);
  assert.ok(buttonEnd >= 0, 'expected the More questions quick-prompt button');
  const buttonStart = html.lastIndexOf('<button', buttonEnd);
  assert.ok(buttonStart >= 0, 'expected the More questions button tag');
  const button = html.slice(buttonStart, buttonEnd + label.length);
  const handler = button.match(/onclick="([^"]+)"/);
  assert.ok(handler, 'expected the button click handler');
  assert.ok(handler[1].startsWith('sermonApp.setKerygmaGuidePrompt('));
  assert.doesNotThrow(() => new vm.Script(handler[1]), 'More Questions click handler must be valid JavaScript');
  assert.ok(handler[1].includes('Format the response as one continuous numbered list from 1 to 5.'));
});

test('More Questions keeps each rationale inside one continuous numbered-list item', () => {
  assert.ok(html.includes('Format the response as one continuous numbered list from 1 to 5.'));
  assert.ok(html.includes('Put each verse reference, question, and a brief Why it matters rationale inside the SAME numbered list item.'));
  assert.ok(html.includes('Do not insert separate paragraphs between list items, and do not restart numbering.'));
});

test('Text and Exegesis guide acts as a critical interpreter and builds on IBS work', () => {
  assert.ok(html.includes('TEXT & EXEGESIS — EXEGETICAL COACHING'));
  assert.ok(html.includes('Exegesis is the critical interpretation and explanation of the biblical text.'));
  assert.ok(html.includes('Before asking a question, review the supplied IBS Observe and Interpretation notes, verse maps and word-study notes, Scripture markups, cross-references, and passage outline where present.'));
  assert.ok(html.includes('Build on it instead of repeating a generic worksheet.'));
  assert.ok(html.includes('Do not ask the user to re-provide information already documented.'));
  assert.ok(html.includes('Focus questions on textual evidence: why a word or connective matters;'));
  assert.ok(html.includes('Do not invent Greek/Hebrew meanings or historical facts.'));
  assert.ok(html.includes('ACTIVE STAGE GUIDANCE:'));
  assert.ok(html.includes('${stageGuidance}'));
  assert.ok(html.includes('IBS PASSAGE OUTLINE (imported text divisions; source evidence, not sermon outline):'));
  assert.ok(html.includes('const stage = this.getKerygmaGuideStage();'));
  assert.ok(html.includes('if (stage.profile === \'exegesis\') {'));
});
test('Kerygma Guide coaches Big Idea, Outline, Applications, and Manuscript stages distinctly', () => {
  assert.ok(html.includes('BIG IDEA & PROPOSITION — FROM EXEGESIS TO ONE CENTRAL CLAIM'));
  assert.ok(html.includes('Distinguish the exegetical idea in the ancient text from the homiletical proposition communicated to contemporary hearers.'));
  assert.ok(html.includes('HOMILETICAL OUTLINE — STRUCTURE FROM THE TEXT'));
  assert.ok(html.includes('Do not treat them as interchangeable or assume the number of textual divisions dictates the number of sermon points.'));
  assert.ok(html.includes('ILLUSTRATIONS & APPLICATION — TEXT-GROUNDED AND AUDIENCE-AWARE'));
  assert.ok(html.includes('Never imply that suffering proves divine punishment or that people earn salvation through works.'));
  assert.ok(html.includes('MANUSCRIPT / NOTES — COHERENT EXPOSITION FROM APPROVED DECISIONS'));
  assert.ok(html.includes('Do not assume a generated draft is approved just because it is present in a field.'));
  assert.ok(html.includes('bigidea: { label: \'Big Idea & Proposition\', profile: \'bigIdea\' }'));
  assert.ok(html.includes('outline: { label: \'Homiletical Outline\', profile: \'outline\' }'));
  assert.ok(html.includes('illustrations: { label: \'Illustrations & Application\', profile: \'applications\' }'));
  assert.ok(html.includes('manuscript: { label: \'Manuscript / Notes\', profile: \'manuscript\' }'));
  assert.ok(html.includes('Never automatically change title, Bible text, notes, Big Idea, outline, applications, manuscript, or the imported IBS source.'));
});

test('Kerygma Guide quick action names the active workflow stage', () => {
  assert.ok(html.includes('id="kerygma-guide-stage-prompt-label">Guide me through Text &amp; Exegesis</span>'));
  assert.ok(html.includes("stagePromptLabel.textContent = 'Guide me through ' + stage.label;"));
  assert.ok(html.includes("this.updateKerygmaGuideContextLabel();\n                document.querySelectorAll('.tab-view')"));
  assert.ok(html.includes("passage: { label: 'Text & Exegesis', profile: 'exegesis' }"));
  assert.ok(html.includes("bigidea: { label: 'Big Idea & Proposition', profile: 'bigIdea' }"));
  assert.ok(html.includes("outline: { label: 'Homiletical Outline', profile: 'outline' }"));
  assert.ok(html.includes("illustrations: { label: 'Illustrations & Application', profile: 'applications' }"));
  assert.ok(html.includes("manuscript: { label: 'Manuscript / Notes', profile: 'manuscript' }"));
  assert.ok(html.includes("sermonApp.setKerygmaGuidePrompt('Guide me through this step. Ask me useful questions rather than doing all the work for me.')"));
});

test('Kerygma Guide panel starts below the workflow tab labels', () => {
  const panel = html.match(/<section id="kerygma-guide-panel"[\s\S]*?>/);
  assert.ok(panel, 'expected the Guide panel');
  assert.ok(panel[0].includes('fixed top-32 right-5'));
  assert.ok(panel[0].includes('max-height:calc(100vh - 13rem)'));
  assert.ok(panel[0].includes('width:min(94vw,760px)'), 'preserve the useful panel width');
});

test('Kerygma Guide visually separates conversations by active workflow stage', () => {
  assert.ok(html.includes("const previousStage = this.getKerygmaGuideStage();"));
  assert.ok(html.includes("if (previousStage.label !== nextStage.label && Array.isArray(this.guideMessages))"));
  assert.ok(html.includes("role: 'stage',\n                        stage: nextStage.label"));
  assert.ok(html.includes("separator.setAttribute('role', 'separator')"));
  assert.ok(html.includes("separator.setAttribute('aria-label', 'New study stage: ' + message.stage)"));
  for (const marker of [
    "'Text & Exegesis': 'STEP 1'",
    "'Big Idea & Proposition': 'STEP 2'",
    "'Homiletical Outline': 'STEP 3'",
    "'Illustrations & Application': 'STEP 4'",
    "'Manuscript / Notes': 'STEP 5'"
  ]) assert.ok(html.includes(marker), `missing stage separator label: ${marker}`);
  assert.ok(html.includes("label.textContent = speaker + ' · ' + (message.stage || 'Text & Exegesis')"));
  assert.ok(html.includes("this.guideMessages.push({ role: 'user', stage: requestedStage.label, content: question });"));
  assert.ok(html.includes("this.guideHistory.push({ role: 'user', stage: requestedStage.label, content: question });"));
  assert.ok(html.includes("'[' + (message.stage || 'stage unspecified') + '] '"));
  assert.ok(!html.includes("this.guideHistory.push({ role: 'stage'"), 'visual dividers must not be added to the AI conversation history');
});

test('outline evidence tracing parses verse references and checks range overlap', () => {
  const parseStart = html.indexOf('            parseOutlineTraceRange(reference, defaultChapter) {');
  const overlapStart = html.indexOf('            outlineTraceRangesOverlap(a, b) {', parseStart);
  const noteStart = html.indexOf('            outlineTraceNotesForRange(notes, range, defaultChapter) {', overlapStart);
  assert.ok(parseStart >= 0 && overlapStart > parseStart && noteStart > overlapStart);
  const parseSource = html.slice(parseStart, overlapStart).trim().replace(/^parseOutlineTraceRange/, 'function parseOutlineTraceRange');
  const overlapEnd = html.indexOf('            renderOutlineEvidenceTrace(item) {', noteStart);
  const overlapSource = html.slice(overlapStart, noteStart).trim().replace(/^outlineTraceRangesOverlap/, 'function outlineTraceRangesOverlap');
  assert.ok(overlapEnd > noteStart);
  const sandbox = {};
  vm.runInNewContext(parseSource + '\n' + overlapSource + '\nthis.helpers = { parseOutlineTraceRange, outlineTraceRangesOverlap };', sandbox);
  const parse = (reference, chapter = 2) => JSON.parse(JSON.stringify(sandbox.helpers.parseOutlineTraceRange(reference, chapter)));
  assert.deepEqual(parse('Romans 2:1-4'), { chapter: 2, start: 1, end: 4 });
  assert.deepEqual(parse('vv. 17–29'), { chapter: 2, start: 17, end: 29 });
  assert.deepEqual(parse('2:5'), { chapter: 2, start: 5, end: 5 });
  assert.equal(parse('no verse reference'), null);
  const overlap = sandbox.helpers.outlineTraceRangesOverlap;
  assert.equal(overlap({ chapter: 2, start: 1, end: 4 }, { chapter: 2, start: 3, end: 6 }), true);
  assert.equal(overlap({ chapter: 2, start: 1, end: 4 }, { chapter: 2, start: 5, end: 8 }), false);
  assert.equal(overlap({ chapter: 2, start: 1, end: 4 }, { chapter: 3, start: 1, end: 4 }), false);
});

test('homiletical points show candidate IBS evidence with provenance and review status', () => {
  assert.ok(html.includes("row.appendChild(this.renderOutlineEvidenceTrace(item));"));
  assert.ok(html.includes("details.className = 'outline-evidence-trace rounded-lg border border-teal-200 bg-white';"));
  for (const label of [
    'Textual basis · Kerygma point reference',
    'Review status',
    'IBS passage divisions · overlapping verse ranges',
    'IBS note blocks · explicit verse references',
    'IBS verse maps and word studies · verses in this range',
    'IBS Scripture observations · visual marks in this range',
    'IBS cross-references · entries from this verse range',
    'Kerygma point explanation · sermon notes'
  ]) assert.ok(html.includes(label), `missing evidence traceability section: ${label}`);
  assert.ok(html.includes('Passage text · imported wording'));
  assert.ok(html.includes('Sermon claim under review · homiletical point'));
  assert.ok(html.includes("filter(([verse, entry]) => Number(verse) >= parsedRange.start && Number(verse) <= parsedRange.end &&"));
  assert.ok(html.includes('Potential links found — verify fit'));
  assert.ok(html.includes('they do not prove that the sermon point correctly interprets the passage'));
  assert.ok(html.includes('Source provenance: IBS content above is shown as imported evidence.'));
  assert.ok(html.includes("content.textContent = text || '';"), 'imported evidence must be rendered as text, not HTML');
  assert.ok(html.includes("this.refreshOutlineEvidenceTrace(item)"), 'evidence view should refresh when point fields change');
  assert.ok(html.includes("if (!packet) reviewStatus = 'No IBS source attached'"));
  assert.ok(html.includes("else if (!parsedRange || bookMismatch || parsedRange.chapter !== studyChapter) reviewStatus = 'Check verse reference'"));
});

test('Illustrations and Application trace keeps Kerygma drafts distinct from IBS Doctrine and Discipleship', () => {
  assert.ok(html.includes('id="application-evidence-trace"'));
  assert.ok(html.includes("this.renderApplicationEvidenceTrace();"));
  assert.ok(html.includes("details.className = 'rounded-lg border border-emerald-200 bg-white';"));
  assert.ok(html.includes('Evidence traceability · Illustrations & Application'));
  for (const label of [
    'Current Kerygma context',
    'Kerygma application draft · seekers / non-believers',
    'Kerygma application draft · believers / growing Christians',
    'Kerygma application draft · suffering / weary hearers',
    'Kerygma illustrations & analogies · saved draft content',
    'Review status',
    'IBS Doctrine · theological guardrails',
    'IBS Discipleship · lived response and formation',
    'IBS passage divisions · source context',
    'IBS selected verses · study emphasis',
    'IBS verse maps & word studies · contextual evidence',
    'IBS personal cross-references · user-created',
    'IBS standard cross-references · imported source'
  ]) assert.ok(html.includes(label), 'missing application evidence category: ' + label);
  assert.ok(html.includes('Doctrine and Discipleship source notes available — review application fit'));
  assert.ok(html.includes('Needs review — no Doctrine or Discipleship notes recorded'));
  assert.ok(html.includes('No imported IBS source packet is attached.'));
  assert.ok(html.includes('The current record does not tag each illustration as user-written or AI-generated'));
  assert.ok(html.includes('Source overlap is context, not proof that an application is faithful or that an illustration is factually accurate.'));
  assert.ok(html.includes('fullText.slice(0, 6000)'));
  assert.ok(html.includes('fullText.slice(0, 1400)'));

  const start = html.indexOf('renderApplicationEvidenceTrace() {');
  const end = html.indexOf('renderBigIdeaEvidenceTrace() {', start);
  assert.ok(start >= 0 && end > start, 'expected the application evidence view method');
  const method = html.slice(start, end);
  assert.ok(!method.includes('saveToStorage('), 'rendering evidence must not write sermon/source data');
  assert.ok(!method.includes('.inductiveStudySource ='), 'rendering evidence must not mutate the imported packet');
  assert.ok(!method.includes('innerHTML'), 'imported source material must be rendered as text');
  assert.ok(method.includes('details.open = wasOpen;'), 'keep the panel expanded during edits');
  const updateMetaStart = html.indexOf('            updateMeta() {');
  const updateMetaEnd = html.indexOf('            switchTab(tabKey)', updateMetaStart);
  assert.ok(updateMetaStart >= 0 && updateMetaEnd > updateMetaStart, 'expected the existing updateMeta form-save method');
  const updateMetaSource = html.slice(updateMetaStart, updateMetaEnd);
  assert.ok(updateMetaSource.includes('this.renderApplicationEvidenceTrace();'), 'refresh application evidence when fields change');
  assert.ok(html.includes('this.renderIllustrations();\n                    this.renderApplicationEvidenceTrace();'), 'refresh after AI-generated applications are inserted');
  assert.ok(html.includes('this.saveToStorage();\n                this.renderIllustrations();\n                this.renderApplicationEvidenceTrace();'), 'refresh after adding/removing illustrations');
});

test('Manuscript evidence trace is read-only and keeps Kerygma draft separate from imported IBS evidence', () => {
  assert.ok(html.includes('id="manuscript-evidence-trace"'));
  assert.ok(html.includes('Evidence traceability · Manuscript / Notes'));
  assert.ok(html.includes("this.renderManuscriptEvidenceTrace();"));
  for (const label of [
    'Current Kerygma manuscript · saved user/AI-edited draft',
    'Approved Big Idea · Kerygma field',
    'Sermon aim · Kerygma field',
    'Homiletical outline points · candidate manuscript structure',
    'IBS Interpretation · imported source evidence',
    'IBS Doctrine · imported theological evidence',
    'IBS passage divisions · possible links to outline / manuscript claims',
    'Potential IBS passage-division links for each outline point · review fit, not proof',
    'Claim / evidence review status · heuristic only',
    'Kerygma application drafts · sermon content, not IBS source',
    'IBS Discipleship · imported response / formation evidence',
    'Human review checklist',
    'Provenance and limits: manuscript text is the current Kerygma draft',
    'this panel does not determine theological correctness'
  ]) assert.ok(html.includes(label), 'missing manuscript evidence category/caveat: ' + label);

  const start = html.indexOf('renderManuscriptEvidenceTrace() {');
  const end = html.indexOf('renderApplicationEvidenceTrace() {', start);
  assert.ok(start >= 0 && end > start, 'expected the manuscript evidence view method');
  const method = html.slice(start, end);
  assert.ok(!method.includes('saveToStorage('), 'rendering manuscript evidence must not write sermon/source data');
  assert.ok(!method.includes('updateMeta('), 'rendering manuscript evidence must not update editable sermon fields');
  assert.ok(!method.includes('.inductiveStudySource ='), 'rendering manuscript evidence must not mutate the imported packet');
  assert.ok(!method.includes('localStorage'), 'rendering manuscript evidence must not access browser storage');
  assert.ok(!method.includes('innerHTML'), 'untrusted manuscript/source text must be rendered via text nodes');
  assert.ok(method.includes('details.open = wasOpen;'), 'preserve open state while refreshing');
  assert.ok(method.includes('fullText.slice(0, limit)'), 'bound manuscript/source excerpts');
  assert.ok(method.includes('entries.slice(0, limit)'), 'bound source list rendering');
  assert.ok(method.includes('this.parseOutlineTraceRange(point.reference, chapterNumber)'), 'parse outline verse references to suggest candidate links');
  assert.ok(method.includes('this.outlineTraceRangesOverlap(parsed, sourceRange)'), 'candidate links require overlapping IBS passage ranges');
  assert.ok(method.includes('Potential unsupported links:'), 'flag outline points with no candidate source division');
  assert.ok(method.includes('does not determine theological correctness'), 'do not present heuristics as theological validation');
  assert.ok(method.includes('No imported IBS source packet is attached.'));
});

test('paragraph-level manuscript trace links explicit Romans 2 references and flags claims for human review', () => {
  const extractMethod = (name, nextName) => {
    const startMarker = '            ' + name + '(';
    const endMarker = '            ' + nextName + '(';
    const start = html.indexOf(startMarker);
    const end = html.indexOf(endMarker, start);
    assert.ok(start >= 0 && end > start, 'expected class method ' + name);
    const methodSource = html.slice(start, end).trim();
    const functionSource = methodSource.replace(new RegExp('^' + name + '\\('), 'function ' + name + '(');
    return vm.runInNewContext('(' + functionSource + ')');
  };

  const splitSentences = extractMethod('splitManuscriptClaimSentences', 'analyzeManuscriptClaimParagraphs');
  const analyze = extractMethod('analyzeManuscriptClaimParagraphs', 'renderManuscriptEvidenceTrace');
  const parseRange = extractMethod('parseOutlineTraceRange', 'outlineTraceRangesOverlap');
  const rangesOverlap = extractMethod('outlineTraceRangesOverlap', 'outlineTraceNotesForRange');
  const context = { splitManuscriptClaimSentences: splitSentences, parseOutlineTraceRange: parseRange, outlineTraceRangesOverlap: rangesOverlap };

  const packet = {
    studyReference: { book: 'Romans', chapter: 2, displayReference: 'Romans 2' },
    sections: {
      interpret: 'Paul exposes the inconsistency of judging others while doing the same things.',
      doctrine: 'God judges impartially according to truth.',
      discipleship: 'Repentance begins with honest self-examination.'
    },
    passageOutline: {
      sections: [
        { verseRange: '2:1-4', heading: 'Judgment according to truth' },
        { verseRange: '2:5-11', heading: 'God shows no partiality' }
      ]
    }
  };
  const outline = [
    { index: 1, statement: 'Judgment according to truth', reference: '2:1-4', notes: '' },
    { index: 2, statement: 'No partiality with God', reference: '2:5-11', notes: '' }
  ];
  const manuscript = [
    '# Romans 2 Sermon',
    '',
    '## Introduction',
    '',
    'People often condemn others before examining their own actions.',
    '',
    '## Exposition',
    '',
    '### I. Judgment of Others Leads to Self-Condemnation (Romans 2:1–4)',
    '',
    'Paul warns the person who judges others while doing the same things (Romans 2:1–4).',
    '',
    'This related paragraph belongs to the heading above but does not repeat a Bible reference. Its second sentence must be assessed separately.',
    '',
    'Paul adds one thought. He explains it in Romans 2:2.',
    '',
    'John 2:1–4 belongs to a different passage and must not be linked automatically to Romans 2.',
    '',
    '## Application',
    '',
    'We should examine ourselves and repent before judging other people.',
    '',
    '## Historical note',
    '',
    'The Roman census happened around AD 50, according to historical accounts.',
    '',
    'Jesus said “...” in this section.'
  ].join('\n');

  const packetBefore = JSON.stringify(packet);
  const manuscriptBefore = manuscript;
  const result = analyze.call(context, manuscript, outline, packet);
  assert.equal(result.totalCount, 8, 'headings are section labels, not paragraph claims');
  assert.equal(result.rows.length, 8);
  assert.equal(result.totalSentenceCount, 10, 'count sentence-level claims across the displayed paragraph blocks');
  assert.equal(result.visibleSentenceCount, 10);
  assert.equal(result.omittedSentenceCount, 0);
  assert.equal(result.omittedCount, 0);
  assert.equal(result.inputTruncated, false);

  const introduction = result.rows.find(row => row.excerpt.includes('People often condemn'));
  assert.equal(introduction.section, 'Introduction');
  assert.ok(introduction.flags.some(flag => flag.includes('No explicit passage reference detected')));

  const exposition = result.rows.find(row => row.excerpt.includes('Paul warns the person'));
  assert.equal(exposition.section, 'Exposition / outline');
  assert.equal(exposition.outlineLinks.length, 1);
  assert.equal(exposition.outlineLinks[0].index, 1);
  assert.equal(exposition.divisionLinks.length, 1);
  assert.ok(exposition.references.some(reference =>
    reference.text.toLowerCase().includes('romans 2:1') && reference.matchesPassage &&
    reference.source === 'paragraph'));

  const inherited = result.rows.find(row => row.excerpt.includes('does not repeat a Bible reference'));
  assert.equal(inherited.section, 'Exposition / outline', 'Roman-numeral outline headings are classified as exposition');
  assert.equal(inherited.headingReferenceInherited, true);
  assert.ok(inherited.references.some(reference =>
    reference.source === 'section heading' &&
    reference.text.includes('Romans 2:1') && reference.matchesPassage));
  assert.equal(inherited.passageRanges.length, 1);
  assert.equal(inherited.outlineLinks.length, 1, 'section heading reference should link this paragraph to the matching outline point');
  assert.equal(inherited.divisionLinks.length, 1, 'section heading reference should link this paragraph to the matching IBS division');
  assert.ok(inherited.flags.some(flag => flag.includes('inherited from the section heading')));
  assert.equal(inherited.claims.length, 2, 'paragraph sentences are assessed separately');
  assert.ok(inherited.claims.every(claim => claim.references.some(reference => reference.source === 'section heading')));
  assert.ok(inherited.claims.every(claim => claim.flags.some(flag => flag.includes('inherited from the section heading'))));
  assert.ok(inherited.claims[0].text.includes('does not repeat a Bible reference'));
  assert.ok(inherited.claims[1].text.includes('second sentence'));
  assert.ok(inherited.claims.every(claim => claim.outlineLinks.length === 1 && claim.divisionLinks.length === 1));

  const paragraphContext = result.rows.find(row => row.excerpt.startsWith('Paul adds one thought'));
  assert.equal(paragraphContext.claims.length, 2);
  assert.ok(paragraphContext.claims[0].references.some(reference => reference.source === 'paragraph context'));
  assert.ok(paragraphContext.claims[0].flags.some(flag => flag.includes('inherited from the paragraph context')));
  assert.ok(paragraphContext.claims[1].references.some(reference => reference.source === 'sentence' && reference.text.includes('Romans 2:2')));

  const splitSample = 'Dr. Paul uses e.g. a teaching example. Romans 2:1–4 establishes the passage. In vv. 5–8, he adds another claim. A.D. 50 is a historical date.';
  assert.deepEqual(Array.from(splitSentences(splitSample)), [
    'Dr. Paul uses e.g. a teaching example.',
    'Romans 2:1–4 establishes the passage.',
    'In vv. 5–8, he adds another claim.',
    'A.D. 50 is a historical date.'
  ], 'common abbreviations and Bible verse punctuation must not create spurious claims');
  assert.ok(html.includes("reference.source === 'section heading' ? ' [from section heading]' : ''"),
    'the UI must label an inherited heading reference');
  assert.ok(html.includes('when the paragraph has no citation of its own'),
    'help text must explain the inheritance rule');

  const otherBook = result.rows.find(row => row.excerpt.includes('John 2:1'));
  assert.equal(otherBook.passageRanges.length, 0, 'a different book must not create an automatic Romans 2 link');
  assert.equal(otherBook.headingReferenceInherited, false, 'an explicit different-book citation must not inherit the section heading range');
  assert.ok(otherBook.references.every(reference => reference.source === 'paragraph'));
  assert.ok(otherBook.flags.some(flag => flag.includes('does not clearly match the imported book/chapter')));

  const application = result.rows.find(row => row.excerpt.includes('We should examine'));
  assert.equal(application.section, 'Application / response');
  assert.ok(application.flags.some(flag => flag.includes('IBS Discipleship')));

  const historical = result.rows.find(row => row.excerpt.includes('Roman census'));
  assert.ok(historical.flags.some(flag => flag.includes('factual / historical detail')));

  const quotation = result.rows.find(row => row.excerpt.includes('Jesus said'));
  assert.ok(quotation.flags.some(flag => flag.includes('theological claim')));
  assert.ok(quotation.flags.some(flag => flag.includes('Quotation or attribution')));

  assert.equal(manuscript, manuscriptBefore);
  assert.equal(JSON.stringify(packet), packetBefore, 'analysis must not mutate imported IBS data');

  const manyParagraphs = Array.from({ length: 35 }, (_, index) =>
    'Paragraph sample ' + (index + 1) + ' includes a claim that needs review.').join('\n\n');
  const bounded = analyze.call(context, manyParagraphs, outline, packet);
  assert.equal(bounded.totalCount, 35);
  assert.equal(bounded.rows.length, 30, 'only the first 30 paragraph blocks are rendered');
  assert.equal(bounded.omittedCount, 5);
  assert.ok(bounded.rows.every(row => row.excerpt.length <= 440), 'display excerpts stay bounded');
  assert.ok(bounded.visibleSentenceCount <= 120, 'the total number of displayed sentence claims is bounded');
  assert.ok(bounded.omittedSentenceCount >= 0);
  assert.ok(html.includes("Paragraph-by-paragraph / sentence-level claim traceability · heuristic review"));
  assert.ok(html.includes("claim.index + ': ' + claim.text"));
  assert.ok(html.includes('Sentence-level claims ('), 'show individual sentence review inside each paragraph');
});

test('Manuscript evidence trace refreshes without altering outline compilation or AI overwrite safeguards', () => {
  assert.ok(html.includes('this.renderManuscriptEvidenceTrace();\n            }\n\n            updateMeta() {'),
    'refresh on sermon load');
  assert.ok(html.includes('this.renderManuscriptEvidenceTrace();\n            }\n\n            switchTab(tabKey)'),
    'refresh after saved manuscript/meta edits');
  assert.ok(html.includes('document.getElementById(\'sermon-manuscript\').value = doc;\n                s.manuscript = doc;\n                this.saveToStorage();\n                this.renderManuscriptEvidenceTrace();'),
    'refresh after explicit outline compilation');
  assert.ok(html.includes("confirmAIFieldOverwrite([\n                    { label: 'sermon manuscript'"),
    'retain existing confirmation before replacing a populated manuscript');
  assert.ok(html.includes('compileOutlineIntoManuscript() {'));
  assert.ok(html.includes('this.renderBigIdeaEvidenceTrace();'));
  assert.ok(html.includes('this.renderApplicationEvidenceTrace();'));
});

test('Big Idea evidence trace presents IBS interpretation and doctrine separately from the sermon claim', () => {
  assert.ok(html.includes('id="big-idea-evidence-trace"'));
  assert.ok(html.includes('this.renderBigIdeaEvidenceTrace();'));
  assert.ok(html.includes("details.className = 'rounded-lg border border-indigo-200 bg-white';"));
  assert.ok(html.includes('Evidence traceability · Big Idea & Proposition'));
  for (const label of [
    'Current sermon claim · Kerygma fields',
    'Exegetical Subject:',
    'Exegetical Complement:',
    'Big Idea / Proposition:',
    'Sermon Aim:',
    'Review status',
    'IBS packet identity',
    'IBS Interpretation · source notes',
    'IBS Doctrine · source guardrails',
    'IBS passage outline · imported text divisions',
    'IBS selected verses',
    'IBS verse maps and word studies · source excerpts',
    'IBS personal cross-references · user-created',
    'IBS standard cross-references · imported source'
  ]) assert.ok(html.includes(label), `missing Big Idea evidence field/category: ${label}`);
  assert.ok(html.includes('Source evidence available — verify the connection'));
  assert.ok(html.includes('Needs review — no Interpretation or Doctrine notes recorded'));
  assert.ok(html.includes('No imported IBS source packet is attached.'));
  assert.ok(html.includes('It does not automatically verify that the Big Idea follows from the evidence.'));
  assert.ok(html.includes("const fullText = String(text || '').trim();"));
  assert.ok(html.includes('fullText.slice(0, 6000)'));
  assert.ok(html.includes('[Excerpt truncated; the complete imported source remains unchanged.]'));

  const start = html.indexOf('renderBigIdeaEvidenceTrace() {');
  const end = html.indexOf('parseOutlineTraceRange(reference, defaultChapter) {', start);
  assert.ok(start >= 0 && end > start, 'expected the Big Idea evidence view method');
  const method = html.slice(start, end);
  assert.ok(!method.includes('saveToStorage('), 'evidence rendering must not write sermon/source data');
  assert.ok(!method.includes('.inductiveStudySource ='), 'evidence rendering must not mutate the imported packet');
  assert.ok(!method.includes('innerHTML'), 'imported evidence must be displayed as text, not HTML');
  assert.ok(method.includes('container.replaceChildren();'));
  assert.ok(method.includes('details.open = wasOpen;'), 'keep the evidence panel expanded while fields refresh');
});

test('Kerygma Guide panel is wider, screen-bounded, and horizontally resizable', () => {
  assert.ok(html.includes('width:min(94vw,760px)'));
  assert.ok(html.includes('min-width:min(94vw,380px)'));
  assert.ok(html.includes('max-width:94vw'));
  assert.ok(html.includes('resize:horizontal'));
  assert.ok(html.includes('fixed top-32 right-5 z-40 flex flex-col'));
  assert.ok(html.includes('max-height:calc(100vh - 13rem)'));
  assert.ok(!html.includes('fixed bottom-20 right-5 z-40 flex max-h-[84vh]'), 'panel must no longer rise over the workflow-tab row');
});

test('the guide-only response limit is bounded server-side for Gemini and OpenRouter', () => {
  assert.ok(html.includes('async callSermonAI(systemPrompt, userQuery, responseSchema = null, maxOutputTokens = null)'));
  assert.ok(serverSource.includes('const maxOutputTokens = Number.isInteger(body.maxOutputTokens)'));
  assert.ok(serverSource.includes('Math.max(128, Math.min(1200, body.maxOutputTokens))'));
  assert.ok(serverSource.includes('max_tokens: maxOutputTokens || 5000'));
  assert.ok(serverSource.includes('...(maxOutputTokens ? { maxOutputTokens } : {})'));
});

test('Kerygma Guide safely renders Markdown headings, emphasis, lists and http(s) links', () => {
  const start = html.indexOf('function renderKerygmaGuideMarkdown(container, markdown) {');
  const end = html.indexOf('class ExpositoryStudio', start);
  assert.ok(start >= 0 && end > start, 'expected the Markdown renderer helper');
  function TestNode(tagName, textContent = '') {
    this.tagName = tagName;
    this.textContent = textContent;
    this.children = [];
    this.attributes = {};
    this.appendChild = child => { this.children.push(child); return child; };
    this.replaceChildren = (...children) => { this.children = children; };
  }
  const sandbox = { document: {
    createElement: tag => new TestNode(tag),
    createTextNode: text => new TestNode('#text', text)
  } };
  vm.runInNewContext(html.slice(start, end) + String.fromCharCode(10) + 'this.renderGuide = renderKerygmaGuideMarkdown;', sandbox);
  const root = new TestNode('div');
  const markdown = '## Key point\nYou noticed **judgment** and *hypocrisy*, with `truth`.\n\n1. Read the passage\n\n2. Ask one question\n\n- Observation\n- Interpretation\n\n[Safe link](https://example.org) [Unsafe link](javascript:alert(1)) <img src=x onerror=alert(1)>';
  sandbox.renderGuide(root, markdown);
  const nodes = [];
  const visit = node => { nodes.push(node); (node.children || []).forEach(visit); };
  visit(root);
  assert.ok(nodes.some(node => node.tagName === 'h4'));
  assert.ok(nodes.some(node => node.tagName === 'strong' && node.textContent === 'judgment'));
  assert.ok(nodes.some(node => node.tagName === 'em' && node.textContent === 'hypocrisy'));
  assert.ok(nodes.some(node => node.tagName === 'code' && node.textContent === 'truth'));
  const orderedLists = nodes.filter(node => node.tagName === 'ol');
  assert.equal(orderedLists.length, 1, 'blank lines must not split a single ordered list');
  assert.equal(orderedLists[0].children.length, 2, 'ordered-list numbering must continue across blank lines');
  assert.ok(nodes.some(node => node.tagName === 'ul'));
  const links = nodes.filter(node => node.tagName === 'a');
  assert.equal(links.length, 1, 'only the http(s) link should become clickable');
  assert.equal(links[0].href, 'https://example.org');
  assert.equal(links[0].rel, 'noopener noreferrer');
  assert.ok(!nodes.some(node => node.tagName === 'img'), 'HTML-like user/model text must not become DOM elements');
  assert.ok(nodes.some(node => node.tagName === '#text' && node.textContent.includes('[Unsafe link](javascript:alert(1))')));
});
test('guide Markdown renderer does not interpret HTML or unsafe URL schemes', () => {
  const start = html.indexOf('function renderKerygmaGuideMarkdown(container, markdown) {');
  const end = html.indexOf('class ExpositoryStudio', start);
  assert.ok(start >= 0 && end > start);
  const helper = html.slice(start, end);
  assert.ok(!helper.includes('innerHTML'), 'guide formatter must use safe DOM creation');
  assert.ok(helper.includes('link.href = match[2]'), 'the href must come only from the validated Markdown URL match');
});
test('Kerygma exegesis banner uses provider-neutral branding', () => {
  assert.ok(html.includes('Kerygma Exegetical Guide'));
  assert.ok(!html.includes('Gemini Exegetical Assistant'));
});

test('sermon export offers an optional, separate imported IBS source appendix', () => {
  assert.ok(html.includes("const includeSource = Boolean(s.inductiveStudySource) && window.confirm("));
  assert.ok(html.includes("includeSource ? formatInductiveStudySourceAppendix(s.inductiveStudySource) : ''"));
  assert.ok(html.includes('Cancel: export sermon content only.'));
  assert.ok(html.includes('SERMON TITLE: ${s.title}'));
  assert.ok(html.includes('MANUSCRIPT / PREACHING NOTES:'));
});

test('source appendix keeps the four IBS stages and provenance categories distinct', () => {
  const start = html.indexOf('function formatInductiveStudySourceAppendix(packet) {');
  const end = html.indexOf('class ExpositoryStudio', start);
  assert.ok(start >= 0 && end > start, 'expected the source appendix formatter');
  const sandbox = {};
  vm.runInNewContext(html.slice(start, end) + String.fromCharCode(10) + 'this.formatAppendix = formatInductiveStudySourceAppendix;', sandbox);
  const appendix = sandbox.formatAppendix({
    format: 'inductive-bible-study-sermon-source',
    version: 1,
    studyReference: { display: 'Romans 2' },
    sermonPassage: 'Romans 2',
    translation: 'KJV',
    exportedAt: '2026-10-20T11:00:00.000Z',
    sourceUpdatedAt: '2026-10-20T10:00:00.000Z',
    passageTextIncluded: false,
    sections: { observe: 'Observation source note', interpret: 'Interpretation source note', doctrine: 'Doctrine source note', discipleship: 'Discipleship source note' },
    passageOutline: { title: 'Imported passage outline', sections: [{ heading: 'Judgment', verseRange: 'Romans 2:1-4', majorIdea: 'A source outline idea', supportingDetails: 'Source details' }] },
    verseMaps: { '1': { keyWords: 'inexcusable' } },
    scriptureMarkups: [{ verse: 1, type: 'observation', quote: 'Therefore' }],
    customCrossReferences: [{ source: { book: 'Romans', chapter: 2, verse: 1 }, target: { book: 'James', chapter: 4, startVerse: 11, endVerse: 11 }, relation: 'theme', note: 'Personal link' }],
    standardCrossReferences: { dataset: 'CrossReferences-org/bible-cross-references', license: 'CC BY 4.0', available: true, entries: [{ verse: 1, anchors: [{ anchor: 'Therefore', references: ['Rom 1:18-20'] }] }] },
    selectedVerses: ['Romans 2:1']
  });
  for (const expected of [
    'APPENDIX: ORIGINAL INDUCTIVE BIBLE STUDY SOURCE',
    'OBSERVE — imported IBS notes',
    'Observation source note',
    'INTERPRETATION — imported IBS notes',
    'Interpretation source note',
    'DOCTRINE — imported IBS notes',
    'Doctrine source note',
    'DISCIPLESHIP — imported IBS notes',
    'Discipleship source note',
    'IBS PASSAGE OUTLINE — source divisions, not the homiletical outline',
    'VERSE MAPS — imported source evidence',
    'SCRIPTURE MARKUP — imported observations, not proof of interpretation',
    'PERSONAL CROSS-REFERENCES — user-created links',
    'STANDARD CROSS-REFERENCES — dataset-derived, distinct from AI suggestions',
    'CrossReferences-org/bible-cross-references',
    'CC BY 4.0',
    'SELECTED VERSES — imported selection',
    'Source study updated at: 2026-10-20T10:00:00.000Z'
  ]) assert.ok(appendix.includes(expected), 'missing appendix evidence: ' + expected);
  assert.ok(appendix.indexOf('OBSERVE — imported IBS notes') < appendix.indexOf('INTERPRETATION — imported IBS notes'));
  assert.ok(!appendix.includes('OPENROUTER_API_KEY'));
});

test('Kerygma UI accepts either server-side provider and never asks for a browser key', () => {
  assert.ok(html.includes('config.aiConfigured === true'));
  assert.ok(html.includes('config.openrouterConfigured === true'));
  assert.ok(html.includes('OPENROUTER_API_KEY'));
  assert.ok(html.includes('Never paste an API key into this page or chat.'));
  assert.ok(!html.includes('kerygma_gemini_api_key'));
  assert.ok(!html.includes('generativelanguage.googleapis.com'));
});
