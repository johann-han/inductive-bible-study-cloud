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
  assert.ok(html.includes('Never request or perform automatic changes to title, Bible text, notes, Big Idea, outline, applications, manuscript'));
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

test('Kerygma Guide defaults to concise coaching instead of a multi-question worksheet', () => {
  assert.ok(html.includes('keep a reply to about 80–140 words'));
  assert.ok(html.includes('ask exactly ONE focused follow-up question OR suggest one next step, not both'));
  assert.ok(html.includes('Do not produce a long numbered list of questions.'));
  assert.ok(html.includes('If the user answers a question, engage that answer before moving forward.'));
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
  const markdown = '## Key point\\nYou noticed **judgment** and *hypocrisy*, with `truth`.\\n\\n1. Read the passage\\n2. Ask one question\\n\\n- Observation\\n- Interpretation\\n\\n[Safe link](https://example.org) [Unsafe link](javascript:alert(1)) <img src=x onerror=alert(1)>';
  sandbox.renderGuide(root, markdown);
  const nodes = [];
  const visit = node => { nodes.push(node); (node.children || []).forEach(visit); };
  visit(root);
  assert.ok(nodes.some(node => node.tagName === 'h4'));
  assert.ok(nodes.some(node => node.tagName === 'strong' && node.textContent === 'judgment'));
  assert.ok(nodes.some(node => node.tagName === 'em' && node.textContent === 'hypocrisy'));
  assert.ok(nodes.some(node => node.tagName === 'code' && node.textContent === 'truth'));
  assert.ok(nodes.some(node => node.tagName === 'ol'));
  assert.ok(nodes.some(node => node.tagName === 'ul'));
  const links = nodes.filter(node => node.tagName === 'a');
  assert.equal(links.length, 1, 'only the http(s) link should become clickable');
  assert.equal(links[0].href, 'https://example.org');
  assert.equal(links[0].rel, 'noopener noreferrer');
  assert.ok(!nodes.some(node => node.tagName === 'img'), 'HTML-like user/model text must not become DOM elements');
  assert.ok(nodes.some(node => node.tagName === '#text' && node.textContent.includes('[Unsafe link](javascript:alert(1))')));
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
