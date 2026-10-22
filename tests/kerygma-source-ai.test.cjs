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
  assert.ok(html.includes('Potential links found — verify fit'));
  assert.ok(html.includes('they do not prove that the sermon point correctly interprets the passage'));
  assert.ok(html.includes('Source provenance: IBS content above is shown as imported evidence.'));
  assert.ok(html.includes("content.textContent = text || '';"), 'imported evidence must be rendered as text, not HTML');
  assert.ok(html.includes("this.refreshOutlineEvidenceTrace(item)"), 'evidence view should refresh when point fields change');
  assert.ok(html.includes("if (!packet) reviewStatus = 'No IBS source attached'"));
  assert.ok(html.includes("else if (!parsedRange || bookMismatch || parsedRange.chapter !== studyChapter) reviewStatus = 'Check verse reference'"));
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
