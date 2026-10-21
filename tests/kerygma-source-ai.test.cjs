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

test('Kerygma UI accepts either server-side provider and never asks for a browser key', () => {
  assert.ok(html.includes('config.aiConfigured === true'));
  assert.ok(html.includes('config.openrouterConfigured === true'));
  assert.ok(html.includes('OPENROUTER_API_KEY'));
  assert.ok(html.includes('Never paste an API key into this page or chat.'));
  assert.ok(!html.includes('kerygma_gemini_api_key'));
  assert.ok(!html.includes('generativelanguage.googleapis.com'));
});
