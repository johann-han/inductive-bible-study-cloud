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
