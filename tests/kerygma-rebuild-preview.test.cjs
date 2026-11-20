'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Data = require('../sermon-preview/data');

const sample = {
  id: 'sermon-1',
  title: 'Romans and the Righteous Judgment of God',
  passage: 'Romans 2:1-16',
  text: 'Therefore you have no excuse, O man.',
  context: 'Paul continues the argument of Romans 1.',
  keywords: 'Therefore; judgment; impartiality',
  exeSubject: 'God judges impartially',
  exeComplement: 'according to truth',
  bigIdea: 'God judges all people impartially and truthfully.',
  aim: 'Call hearers to humility before God.',
  outline: [
    { id: 'p1', reference: 'Romans 2:1-4', statement: 'The danger of judging others', notes: 'The judge shares the same guilt.' }
  ],
  illustrations: [{ id: 'i1', title: 'The mirror', content: 'A mirror exposes our own condition.' }],
  appSeekers: 'Respond to God with repentance.',
  appBelievers: 'Reject self-righteousness.',
  appSuffering: 'Bring suffering and fear to Christ.',
  manuscript: '# Introduction\n\nThe text confronts self-righteous judgment.',
  inductiveStudySource: {
    format: 'inductive-bible-study-sermon-source',
    version: 1,
    sermonPassage: 'Romans 2:1-16',
    sections: {
      observe: 'The passage uses therefore.',
      interpret: 'Paul addresses the judging person.',
      doctrine: 'God judges impartially.',
      discipleship: 'Practice humility.'
    }
  },
  updated_at: '2026-11-18T10:00:00.000Z'
};

test('parses current Kerygma sermon records without changing their source fields', () => {
  const input = [sample, null, { title: 'Missing ID' }];
  const parsed = Data.parseStoredSermons(JSON.stringify(input));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, sample.id);
  assert.equal(parsed[0].title, sample.title);
  assert.equal(parsed[0].passage, sample.passage);
  assert.deepEqual(parsed[0].outline, sample.outline);
  assert.deepEqual(parsed[0].inductiveStudySource.sections, sample.inductiveStudySource.sections);
  assert.deepEqual(input[0], sample);
});

test('reads the existing browser cache without calling any storage write or delete method', () => {
  const values = new Map([[Data.STORAGE_KEY, JSON.stringify([sample])]]);
  let reads = 0;
  let writes = 0;
  let deletes = 0;
  const storage = {
    getItem(key) { reads += 1; return values.get(key) || null; },
    setItem() { writes += 1; },
    removeItem() { deletes += 1; }
  };
  const records = Data.readLocalSermons(storage);
  assert.equal(records.length, 1);
  assert.equal(reads, 1);
  assert.equal(writes, 0);
  assert.equal(deletes, 0);
});

test('malformed, missing and non-array storage returns an empty collection safely', () => {
  assert.deepEqual(Data.parseStoredSermons('{bad json'), []);
  assert.deepEqual(Data.parseStoredSermons('{"sermons":[]}'), []);
  assert.deepEqual(Data.parseStoredSermons(null), []);
  assert.deepEqual(Data.readLocalSermons({ getItem: () => { throw new Error('Storage unavailable'); } }), []);
});

test('dashboard statistics are derived from the existing sermon records', () => {
  const second = { id: 'sermon-2', title: 'A sermon in progress', passage: 'John 1:1' };
  const records = Data.parseStoredSermons([sample, second]);
  assert.deepEqual(Data.deriveDashboardStats(records), {
    total: 2,
    withInductiveSource: 1,
    withOutline: 1,
    withManuscript: 1
  });
});

test('stage progress follows the five established Kerygma workflow stages', () => {
  const records = Data.parseStoredSermons([sample]);
  const stages = Data.getStageProgress(records[0]);
  assert.deepEqual(stages.map(stage => stage.id), ['passage', 'bigIdea', 'outline', 'illustrations', 'manuscript']);
  assert.deepEqual(stages.map(stage => stage.state), ['complete', 'complete', 'complete', 'complete', 'complete']);
  const empty = Data.getStageProgress({ id: 'empty' });
  assert.ok(empty.every(stage => stage.state === 'not-started'));
});

test('sermon search finds passage, Big Idea, manuscript and outline text', () => {
  const records = Data.parseStoredSermons([sample]);
  assert.equal(Data.filterSermons(records, 'Romans 2').length, 1);
  assert.equal(Data.filterSermons(records, 'impartially and truthfully').length, 1);
  assert.equal(Data.filterSermons(records, 'self-righteous judgment').length, 1);
  assert.equal(Data.filterSermons(records, 'mirror').length, 1);
  assert.equal(Data.filterSermons(records, 'no matching term').length, 0);
});

test('IBS source summary keeps the four imported study stages distinct', () => {
  const records = Data.parseStoredSermons([sample]);
  const summary = Data.getSourceSummary(records[0]);
  assert.equal(summary.attached, true);
  assert.equal(summary.passage, 'Romans 2:1-16');
  assert.equal(summary.stageCount, 4);
  const withoutSource = Data.getSourceSummary({ id: 'plain-sermon' });
  assert.equal(withoutSource.attached, false);
  assert.equal(withoutSource.stageCount, 0);
});

test('recent sermon sorting uses saved update timestamps without mutating the input list', () => {
  const older = Data.normalizeSermonForDisplay({ id: 'older', title: 'Older', updated_at: '2026-11-01T00:00:00.000Z' });
  const newer = Data.normalizeSermonForDisplay({ id: 'newer', title: 'Newer', updated_at: '2026-11-19T00:00:00.000Z' });
  const records = [older, newer];
  const sorted = Data.sortRecentSermons(records);
  assert.deepEqual(sorted.map(row => row.id), ['newer', 'older']);
  assert.deepEqual(records.map(row => row.id), ['older', 'newer']);
});

test('rebuild preview is isolated from the legacy studio and has no persistence or AI mutation path', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'sermon-preview', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'sermon-preview', 'app.js'), 'utf8');
  const data = fs.readFileSync(path.join(root, 'sermon-preview', 'data.js'), 'utf8');
  const legacy = fs.readFileSync(path.join(root, 'sermon', 'index.html'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

  assert.ok(html.includes('/sermon-preview/styles.css'));
  assert.ok(html.includes('/sermon-preview/data.js'));
  assert.ok(html.includes('/sermon-preview/app.js'));
  assert.ok(app.includes("Data.readLocalSermons(window.localStorage)"));
  assert.ok(app.includes("'/sermon/index.html'"));
  assert.ok(data.includes("inductiveStudySource"));
  assert.ok(!app.includes('localStorage.setItem'));
  assert.ok(!app.includes('localStorage.removeItem'));
  assert.ok(!app.includes('fetch('));
  assert.ok(!data.includes('setItem('));
  assert.ok(!data.includes('removeItem('));
  assert.ok(!data.includes('fetch('));
  assert.ok(legacy.includes('class ExpositoryStudio'));
  assert.ok(legacy.includes("localStorage.getItem('kerygma_sermons')"));
  assert.ok(server.includes("filePath.endsWith('.css') ? 'text/css; charset=utf-8'"));
});

test('preview scripts parse as JavaScript and preserve the existing read-only route', () => {
  const root = path.join(__dirname, '..');
  const app = fs.readFileSync(path.join(root, 'sermon-preview', 'app.js'), 'utf8');
  const data = fs.readFileSync(path.join(root, 'sermon-preview', 'data.js'), 'utf8');
  assert.doesNotThrow(() => new vm.Script(app));
  assert.doesNotThrow(() => new vm.Script(data));
  assert.ok(fs.existsSync(path.join(root, 'sermon', 'index.html')));
});
