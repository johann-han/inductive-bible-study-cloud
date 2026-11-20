'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Data = require('../sermon-preview/data');
const Archive = require('../sermon-preview/archive');
const { ClaimReviewEngine } = require('../sermon-preview/claim-review');
const { KerygmaCloudAdapter } = require('../sermon-preview/cloud-adapter');
const CloudSync = require('../sermon/cloud-sync');

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

test('reads the existing browser cache without changing it', () => {
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

test('writes edited sermons only to the existing Kerygma cache key', () => {
  const values = new Map([
    [Data.STORAGE_KEY, JSON.stringify([sample])],
    [Data.CLAIM_REVIEW_KEY, JSON.stringify({ 'sermon-1': { 'p1-s1-a': 'needs-research' } })],
    ['unrelated-preference', 'keep-me']
  ]);
  const writes = [];
  const deletes = [];
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { writes.push(key); values.set(key, value); },
    removeItem(key) { deletes.push(key); values.delete(key); }
  };
  const records = Data.readLocalSermons(storage);
  records[0].bigIdea = 'A carefully revised central claim.';
  records[0].customExtension = { retained: true };
  assert.equal(Data.writeLocalSermons(storage, records), true);
  assert.deepEqual(writes, [Data.STORAGE_KEY]);
  assert.deepEqual(deletes, []);
  assert.equal(JSON.parse(values.get(Data.STORAGE_KEY))[0].bigIdea, 'A carefully revised central claim.');
  assert.deepEqual(JSON.parse(values.get(Data.CLAIM_REVIEW_KEY)), { 'sermon-1': { 'p1-s1-a': 'needs-research' } });
  assert.equal(values.get('unrelated-preference'), 'keep-me');
});

test('record normalization preserves existing extension fields and unknown sermon metadata', () => {
  const raw = {
    ...sample,
    customExtension: { retained: true },
    importMetadata: { schemaVersion: 1 },
    inductiveStudySource: { ...sample.inductiveStudySource, extraSourceField: 'preserve' }
  };
  const normalized = Data.normalizeSermonForDisplay(raw);
  assert.deepEqual(normalized.customExtension, raw.customExtension);
  assert.deepEqual(normalized.importMetadata, raw.importMetadata);
  assert.equal(normalized.inductiveStudySource.extraSourceField, 'preserve');
});

test('new sermon records retain the established Kerygma field contract', () => {
  const record = Data.createSermonRecord();
  assert.match(record.id, /^sermon-/);
  for (const key of [
    'title','passage','text','context','keywords','exeSubject','exeComplement','bigIdea','aim',
    'outline','illustrations','appSeekers','appBelievers','appSuffering','manuscript'
  ]) assert.ok(Object.hasOwn(record, key), 'missing existing Kerygma field: ' + key);
  assert.equal(record.outline.length, 1);
  assert.equal(record.inductiveStudySource, undefined);
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

test('redesigned preview uses the existing local sermon cache and preserves the legacy studio route', () => {
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
  assert.ok(app.includes("window.open('/sermon/index.html'"));
  assert.ok(app.includes("Data.writeLocalSermons(window.localStorage, state.sermons)"));
  assert.ok(app.includes("fetch('/api/sermon-ai'"), 'generation and Guide requests should use the established server endpoint');
  assert.ok(app.includes("fetch('/api/config'"));
  assert.ok(app.includes("callAI(prompt.system, prompt.query, prompt.schema || null)"));
  assert.ok(app.includes("callAI(systemPrompt, userQuery, null, 900)"));
  assert.ok(app.includes("state.guideMessages.filter(item => item.role === 'user' || item.role === 'assistant')"));
  assert.ok(app.includes('function renderGuideMarkdown(container, markdown)'));
  assert.ok(app.includes('function appendGuideInline(parent, value)'));
  assert.ok(!app.includes('body.innerHTML'));
  assert.ok(app.includes('Do not edit, save or claim to have changed any sermon field or imported IBS source.'));
  assert.ok(data.includes("inductiveStudySource"));
  const archiveModule = fs.readFileSync(path.join(root, 'sermon-preview', 'archive.js'), 'utf8');
  assert.ok(html.includes('/sermon-preview/archive.js'));
  assert.ok(html.includes('workspace-archive-input'));
  assert.ok(app.includes('function backupWorkspace()'));
  assert.ok(app.includes('function handleWorkspaceArchiveFile(file)'));
  assert.ok(app.includes("Archive.restoreWorkspaceArchive(window.localStorage, plan)"));
  assert.ok(app.includes("Archive.buildRestorePlan(current, archive, mode, statuses, pending, pendingOwner, activeOwner)"));
  assert.ok(archiveModule.includes("const FORMAT = 'kerygma-sermon-workspace'"));
  assert.ok(archiveModule.includes("storage.setItem(key, value)"));
  assert.ok(archiveModule.includes("const PENDING_KEY = 'kerygma_pending_cloud_deletions'"));
  assert.ok(app.includes('Archive.readRawPendingCloudDeletions(window.localStorage)'));
  assert.ok(!archiveModule.includes('localStorage.clear'));

  assert.ok(data.includes("target.setItem(STORAGE_KEY, JSON.stringify(rows))"));
  assert.ok(!app.includes('localStorage.removeItem'));
  assert.ok(!data.includes('removeItem('));
  assert.ok(legacy.includes('class ExpositoryStudio'));
  assert.ok(legacy.includes("localStorage.getItem('kerygma_sermons')"));
  assert.ok(server.includes("filePath.endsWith('.css') ? 'text/css; charset=utf-8'"));
  assert.ok(server.includes("isKerygmaPreviewAsset"));
});

test('redesigned editor exposes five existing Kerygma stages, source review and protected AI workflows', () => {
  const root = path.join(__dirname, '..');
  const app = fs.readFileSync(path.join(root, 'sermon-preview', 'app.js'), 'utf8');
  const data = fs.readFileSync(path.join(root, 'sermon-preview', 'data.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'sermon-preview', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'sermon-preview', 'styles.css'), 'utf8');
  for (const required of [
    'renderPassageStage','renderBigIdeaStage','renderOutlineStage','renderApplicationsStage','renderManuscriptStage',
    'renderSourcePanel','renderEvidenceCard','handleImportFile','applyImportedPacket','exportCurrentSermon',
    'runAIGeneration','sendGuide','sourcePromptContext'
  ]) assert.ok(app.includes(required), 'missing redesigned workflow element: ' + required);
  for (const required of ['Text & Exegesis','Big Idea & Proposition','Homiletical Outline','Illustrations & Application','Manuscript / Notes']) {
    assert.ok(data.includes(required), 'missing established sermon stage: ' + required);
  }
  assert.ok(app.includes('supabaseClient.auth.getSession()'));
  assert.ok(app.includes("Authorization: 'Bearer ' + token"));
  assert.ok(app.includes('Source Inductive Study'));
  for (const evidenceCategory of [
    'IBS passage outline','Verse maps and word-study notes','Scripture markup and observations',
    'Personal cross-references · user-created','Standard cross-references · dataset provenance',
    'Related passages and included verse text','Selected verses'
  ]) assert.ok(app.includes(evidenceCategory), 'missing structured IBS evidence category: ' + evidenceCategory);
  assert.ok(app.includes('item.includedInStageNotes'));
  assert.ok(app.includes('packet.passageText'));
  assert.ok(html.includes('/sermon-preview/claim-review.js'));
  assert.ok(app.includes('const engine = new ClaimReview.ClaimReviewEngine(state.sermons, window.localStorage)'));
  assert.ok(app.includes('engine.buildClaimReviewQueue(100, 100)'));
  assert.ok(app.includes('engine.saveClaimReviewStatus(item.sermonId, item.reviewKey, select.value)'));
  assert.ok(app.includes('openClaimInManuscript(item)'));
  assert.ok(app.includes('Claim-review migration is the next rebuild stage') === false);
  assert.ok(css.includes('.sidebar'));
  assert.ok(css.includes('.workflow-tabs'));
  assert.ok(css.includes('@media(max-width:650px)'));
  assert.ok(css.includes('.topbar-actions{width:100%;gap:5px;flex-wrap:wrap;justify-content:flex-start}'));
});

test('IBS packet import validates format, version, book, passage and all four stages before use', () => {
  const packet = {
    format: 'inductive-bible-study-sermon-source',
    version: 1,
    studyReference: { book: 'Romans', chapter: 2, display: 'Romans 2' },
    sermonPassage: 'Romans 2:1-16',
    translation: 'KJV',
    sections: { observe: 'Observe note', interpret: 'Interpret note', doctrine: 'Doctrine note', discipleship: 'Discipleship note' },
    passageOutline: { sections: [{ heading: 'Judgment', verseRange: '1-4' }] }
  };
  const normalized = Data.normalizeSourcePacket(packet);
  assert.equal(normalized.sermonPassage, 'Romans 2:1-16');
  assert.equal(normalized.sections.observe, 'Observe note');
  assert.equal(normalized.sections.interpret, 'Interpret note');
  assert.equal(normalized.sections.doctrine, 'Doctrine note');
  assert.equal(normalized.sections.discipleship, 'Discipleship note');
  assert.throws(() => Data.normalizeSourcePacket({ ...packet, version: 2 }), /version 1/i);
  assert.throws(() => Data.normalizeSourcePacket({ ...packet, sermonPassage: 'John 1:1' }), /inside Romans 2/i);
  assert.throws(() => Data.normalizeSourcePacket({ ...packet, sections: { observe: 'x' } }), /all four IBS study stages/i);
});

test('legacy claim extraction and sentence segmentation are retained in the redesigned workspace', () => {
  const engine = new ClaimReviewEngine([], { getItem: () => null, setItem: () => {} });
  const claim = engine.extractManuscriptClaimProposition('The text teaches that God judges impartially.');
  assert.equal(claim.kind, 'claim');
  assert.match(claim.proposition, /God judges impartially/);
  assert.deepEqual(engine.splitManuscriptClaimSentences('Dr. Paul writes clearly. God judges impartially.'), [
    'Dr. Paul writes clearly.',
    'God judges impartially.'
  ]);
});

test('claim review preserves stable keys and writes status to the existing separate store', () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); }
  };
  const engine = new ClaimReviewEngine([], storage);
  const claim = { kind: 'claim', index: 2, proposition: 'God judges impartially.' };
  const key = engine.makeClaimReviewKey(3, claim);
  assert.equal(key, engine.makeClaimReviewKey(3, { ...claim, proposition: ' God   judges impartially. ' }));
  assert.equal(engine.saveClaimReviewStatus('sermon-1', key, 'needs-research'), true);
  assert.equal(engine.getClaimReviewStatus('sermon-1', key), 'needs-research');
  assert.equal(values.has(Data.CLAIM_REVIEW_KEY), true);
  assert.equal(engine.saveClaimReviewStatus('sermon-1', key, 'invalid'), false);
});

test('claim review queue uses original paragraph analysis, separate statuses, and filtering', () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); }
  };
  const sermon = {
    id: 'claim-sermon-1',
    title: 'Romans 2 — Divine Judgment',
    passage: 'Romans 2:1-16',
    manuscript: '# Exposition\n\n## Romans 2:1-4\nThe text teaches that God judges impartially.',
    outline: [{ id: 1, reference: 'Romans 2:1-4', statement: 'God judges impartially', notes: 'The text states this.' }],
    inductiveStudySource: {
      studyReference: { book: 'Romans', chapter: 2, display: 'Romans 2' },
      sections: { observe: 'Therefore', interpret: 'Paul addresses the judge', doctrine: 'God judges impartially', discipleship: 'Reject hypocrisy' },
      passageOutline: { sections: [{ heading: 'The impartial judgment of God', verseRange: '1-4' }] }
    }
  };
  const engine = new ClaimReviewEngine([sermon], storage);
  const analysis = engine.analyzeManuscriptClaimParagraphs(sermon.manuscript, [
    { index: 1, reference: 'Romans 2:1-4', statement: 'God judges impartially', notes: '' }
  ], sermon.inductiveStudySource);
  assert.ok(analysis.rows.length > 0);
  const found = analysis.rows.flatMap(row => row.claims.map(claim => ({ row, claim })))
    .find(item => item.claim.kind === 'claim');
  assert.ok(found, 'expected one substantive candidate proposition');
  assert.match(found.claim.proposition, /God judges impartially/);
  const key = engine.makeClaimReviewKey(found.row.index, found.claim);
  assert.equal(engine.saveClaimReviewStatus(sermon.id, key, 'needs-research'), true);
  const queue = engine.buildClaimReviewQueue();
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].reviewKey, key);
  assert.equal(queue.items[0].status, 'needs-research');
  assert.equal(engine.filterClaimReviewQueueItems(queue.items, 'needs-research', 'Romans 2').length, 1);
  assert.equal(engine.saveClaimReviewStatus(sermon.id, key, 'reviewed'), true);
  const reviewedQueue = engine.buildClaimReviewQueue();
  assert.equal(reviewedQueue.items.length, 0);
  assert.equal(reviewedQueue.counts.reviewed, 1);
});

test('claim review reference matching retains chapter ranges and overlap semantics', () => {
  const engine = new ClaimReviewEngine([], { getItem: () => null, setItem: () => {} });
  assert.deepEqual(engine.parseOutlineTraceRange('Romans 2:1–4', 2), { chapter: 2, start: 1, end: 4 });
  assert.deepEqual(engine.parseOutlineTraceRange('vv. 5-8', 2), { chapter: 2, start: 5, end: 8 });
  assert.equal(engine.outlineTraceRangesOverlap({ chapter: 2, start: 1, end: 4 }, { chapter: 2, start: 4, end: 6 }), true);
  assert.equal(engine.outlineTraceRangesOverlap({ chapter: 2, start: 1, end: 3 }, { chapter: 3, start: 1, end: 3 }), false);
});


test('redesigned PR preview does not initialise the live Supabase cloud adapter', () => {
  const root = require('node:path').join(__dirname, '..');
  const app = require('node:fs').readFileSync(require('node:path').join(root, 'sermon-preview', 'app.js'), 'utf8');
  assert.ok(app.includes('new Cloud.KerygmaCloudAdapter'));
  assert.ok(app.includes('Cloud sync held back in preview'));
  assert.ok(!app.includes('cloudAdapter.initializeCloudSermons()'));
  assert.ok(app.includes("window.open('/sermon/index.html'"));
});

test('preview scripts parse as JavaScript and preserve the existing Kerygma route', () => {
  const root = path.join(__dirname, '..');
  const app = fs.readFileSync(path.join(root, 'sermon-preview', 'app.js'), 'utf8');
  const data = fs.readFileSync(path.join(root, 'sermon-preview', 'data.js'), 'utf8');
  const claims = fs.readFileSync(path.join(root, 'sermon-preview', 'claim-review.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'sermon-preview', 'index.html'), 'utf8');
  const { ClaimReviewEngine } = require('../sermon-preview/claim-review');
  assert.doesNotThrow(() => new vm.Script(app));
  assert.doesNotThrow(() => new vm.Script(data));
  assert.doesNotThrow(() => new vm.Script(claims));
  assert.ok(html.includes('/sermon-preview/claim-review.js'));
  assert.ok(fs.existsSync(path.join(root, 'sermon', 'index.html')));
});


test('workspace archive preserves every sermon field, extension data, IBS source, Unicode and long notes', () => {
  const longNote = 'λόγος — יהוה — exposition '.repeat(12000);
  const complete = {
    ...sample,
    text: 'Ἐν ἀρχῇ — In the beginning',
    context: 'לְמַעַן — context',
    keywords: 'Greek; Hebrew; Aramaic',
    exeSubject: 'The Word exists eternally',
    exeComplement: 'and is with God',
    manuscript: longNote,
    customExtension: { version: 7, nested: ['kept', { enabled: true }] },
    inductiveStudySource: {
      ...sample.inductiveStudySource,
      passageText: 'Ἐν ἀρχῇ ἦν ὁ λόγος',
      verseMaps: { '1': { greek: 'λόγος', morphology: 'N-NSM', strong: 'G3056' } },
      standardCrossReferences: { dataset: 'sample dataset', license: 'CC BY', entries: [{ verse: 1, references: ['John 1:1'] }] }
    }
  };
  const statuses = { [complete.id]: { claimA: 'reviewed', claimB: 'needs-research' } };
  const pending = [{ sermon_id: 'deleted-1', sermon_data: { id: 'deleted-1', title: 'Deleted record' } }];
  const archive = Archive.createWorkspaceArchive([complete], statuses, 'owner-a', '2026-11-20T08:00:00.000Z', pending, 'owner-a');
  const restored = Archive.parseWorkspaceArchive(JSON.stringify(archive));
  assert.equal(restored.sermonCount, 1);
  assert.equal(restored.ownerId, 'owner-a');
  assert.equal(restored.sermons[0].manuscript, longNote);
  assert.deepEqual(restored.sermons[0].customExtension, complete.customExtension);
  assert.deepEqual(restored.sermons[0].inductiveStudySource, complete.inductiveStudySource);
  assert.deepEqual(restored.claimReviewStatuses, statuses);
  assert.deepEqual(restored.pendingCloudDeletions, pending);
  assert.equal(restored.pendingCloudDeletionsOwnerId, 'owner-a');
});

test('workspace archive rejects malformed data, unsupported versions and duplicate or missing sermon IDs', () => {
  assert.throws(() => Archive.parseWorkspaceArchive('{bad'), /valid JSON/i);
  assert.throws(() => Archive.parseWorkspaceArchive({ format: Archive.FORMAT, version: 2, sermons: [] }), /version 1/i);
  assert.throws(() => Archive.parseWorkspaceArchive({ format: Archive.FORMAT, version: 1, sermons: [{ id: 'x' }, { id: 'x' }] }), /duplicate sermon ID/i);
  assert.throws(() => Archive.parseWorkspaceArchive({ format: Archive.FORMAT, version: 1, sermons: [{ title: 'Missing ID' }] }), /missing or invalid ID/i);
  assert.throws(() => Archive.parseWorkspaceArchive({ format: Archive.FORMAT, version: 1, sermons: {}, sermonCount: 0 }), /sermon array/i);
});

test('workspace restore is idempotent by sermon ID and preserves existing records by default', () => {
  const current = [{ ...sample, title: 'Current wording', customLocalField: 'keep' }];
  const incoming = Archive.createWorkspaceArchive([
    { ...sample, title: 'Backup wording' },
    { id: 'new-sermon', title: 'A new sermon', manuscript: 'New' }
  ], {
    [sample.id]: { claimA: 'reviewed' },
    'new-sermon': { claimB: 'needs-research' }
  }, null);
  const statuses = { [sample.id]: { claimA: 'requires-revision', currentOnly: 'reviewed' } };
  const plan = Archive.buildRestorePlan(current, incoming, 'skip-conflicts', statuses);
  assert.equal(plan.added, 1);
  assert.equal(plan.skipped, 1);
  assert.equal(plan.replaced, 0);
  assert.equal(plan.sermons.find(row => row.id === sample.id).title, 'Current wording');
  assert.equal(plan.sermons.find(row => row.id === sample.id).customLocalField, 'keep');
  assert.equal(plan.claimReviewStatuses[sample.id].claimA, 'requires-revision');
  assert.equal(plan.claimReviewStatuses[sample.id].currentOnly, 'reviewed');
  assert.equal(plan.claimReviewStatuses['new-sermon'].claimB, 'needs-research');
  const repeated = Archive.buildRestorePlan(plan.sermons, incoming, 'skip-conflicts', plan.claimReviewStatuses);
  assert.equal(repeated.added, 0);
  assert.equal(repeated.skipped, 2);
  assert.equal(repeated.sermons.length, 2);
});

test('workspace restore replaces only explicit matching IDs and does not delete unrelated sermons', () => {
  const current = [
    { id: 'existing', title: 'Local version' },
    { id: 'keep-outside-archive', title: 'Unaffected' }
  ];
  const incoming = Archive.createWorkspaceArchive([
    { id: 'existing', title: 'Backup version', customField: { restored: true } }
  ], { existing: { claim: 'reviewed' } }, null);
  const plan = Archive.buildRestorePlan(current, incoming, 'replace-conflicts', { existing: { claim: 'needs-research', old: 'keep?' } });
  assert.equal(plan.replaced, 1);
  assert.equal(plan.sermons.find(row => row.id === 'existing').title, 'Backup version');
  assert.deepEqual(plan.sermons.find(row => row.id === 'existing').customField, { restored: true });
  assert.ok(plan.sermons.some(row => row.id === 'keep-outside-archive'));
  assert.equal(plan.claimReviewStatuses.existing.claim, 'reviewed');
});

test('workspace restore writes only the existing sermon and claim-review keys', () => {
  const values = new Map([
    [Archive.STORAGE_KEY, JSON.stringify([{ id: 'existing', title: 'Existing' }])],
    [Archive.CLAIM_REVIEW_KEY, JSON.stringify({ existing: { claim: 'reviewed' } })],
    [Archive.PENDING_KEY, JSON.stringify([{ sermon_id: 'old-deleted', sermon_data: { id: 'old-deleted' } }])],
    [Archive.PENDING_OWNER_KEY, 'user-a'],
    ['unrelated-preference', 'keep']
  ]);
  const writes = [];
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { writes.push(key); values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
  const archive = Archive.createWorkspaceArchive([{ id: 'added', title: 'Added' }], { added: { claim: 'reviewed' } }, 'user-a', null,
    [{ sermon_id: 'new-deleted', sermon_data: { id: 'new-deleted', title: 'Removed earlier' } }], 'user-a');
  const plan = Archive.buildRestorePlan([{ id: 'existing', title: 'Existing' }], archive, 'skip-conflicts',
    { existing: { claim: 'reviewed' } }, [{ sermon_id: 'old-deleted', sermon_data: { id: 'old-deleted' } }], 'user-a');
  assert.equal(Archive.restoreWorkspaceArchive(storage, plan), true);
  assert.deepEqual(writes, [Archive.STORAGE_KEY, Archive.CLAIM_REVIEW_KEY, Archive.PENDING_KEY, Archive.PENDING_OWNER_KEY, Archive.OWNER_KEY]);
  assert.equal(JSON.parse(values.get(Archive.STORAGE_KEY)).length, 2);
  assert.deepEqual(JSON.parse(values.get(Archive.CLAIM_REVIEW_KEY)).added, { claim: 'reviewed' });
  assert.deepEqual(JSON.parse(values.get(Archive.PENDING_KEY)).map(row => row.sermon_id), ['old-deleted', 'new-deleted']);
  assert.equal(values.get(Archive.PENDING_OWNER_KEY), 'user-a');
  assert.equal(values.get(Archive.OWNER_KEY), 'user-a');
  assert.equal(values.get('unrelated-preference'), 'keep');
});

test('workspace restore rolls back the sermon cache if the separate status-store write fails', () => {
  const previousSermons = JSON.stringify([{ id: 'old', title: 'Keep old' }]);
  const previousStatuses = JSON.stringify({ old: { claim: 'reviewed' } });
  const values = new Map([[Archive.STORAGE_KEY, previousSermons], [Archive.CLAIM_REVIEW_KEY, previousStatuses]]);
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) {
      if (key === Archive.CLAIM_REVIEW_KEY && JSON.parse(value).new) throw new Error('quota exceeded');
      values.set(key, value);
    },
    removeItem(key) { values.delete(key); }
  };
  const archive = Archive.createWorkspaceArchive([{ id: 'new', title: 'New record' }], { new: { claim: 'reviewed' } }, null);
  const plan = Archive.buildRestorePlan([{ id: 'old', title: 'Keep old' }], archive, 'skip-conflicts', { old: { claim: 'reviewed' } });
  assert.throws(() => Archive.restoreWorkspaceArchive(storage, plan), /previous workspace stores were restored/i);
  assert.equal(values.get(Archive.STORAGE_KEY), previousSermons);
  assert.equal(values.get(Archive.CLAIM_REVIEW_KEY), previousStatuses);
});

test('workspace archive owner information is retained and raw cache reads do not normalize record content', () => {
  const raw = [{ id: 'raw', title: '  exact spacing  ', arbitrary: { value: 0 } }];
  const storage = {
    getItem(key) {
      if (key === Archive.STORAGE_KEY) return JSON.stringify(raw);
      if (key === Archive.OWNER_KEY) return 'owner-raw';
      if (key === Archive.CLAIM_REVIEW_KEY) return '{}';
      return null;
    }
  };
  assert.deepEqual(Archive.readRawSermonRecords(storage), raw);
  assert.equal(Archive.readOwnerId(storage), 'owner-raw');
  assert.deepEqual(Archive.readRawPendingCloudDeletions(storage), []);
  assert.equal(Archive.readPendingDeletionOwnerId(storage), null);
});


test('workspace restore rejects pending deletion queues assigned to different accounts', () => {
  const archive = Archive.createWorkspaceArchive([], {}, 'owner-a', null,
    [{ sermon_id: 'deleted-a', sermon_data: { id: 'deleted-a' } }], 'owner-a');
  assert.throws(() => Archive.buildRestorePlan([], archive, 'skip-conflicts', {},
    [{ sermon_id: 'deleted-b', sermon_data: { id: 'deleted-b' } }], 'owner-b'), /different accounts/i);
});


test('workspace restore adopts the archive account owner marker in an unowned workspace', () => {
  const archive = Archive.createWorkspaceArchive([{ id: 'owner-a-sermon', title: 'Owned archive' }], {}, 'owner-a');
  const plan = Archive.buildRestorePlan([], archive, 'skip-conflicts', {}, [], null, null);
  assert.equal(plan.ownerId, 'owner-a');
  const values = new Map();
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
  Archive.restoreWorkspaceArchive(storage, plan);
  assert.equal(values.get(Archive.OWNER_KEY), 'owner-a');
});

test('workspace restore rejects an archive owned by another account before planning writes', () => {
  const archive = Archive.createWorkspaceArchive([{ id: 'owner-a-sermon', title: 'Owned archive' }], {}, 'owner-a');
  assert.throws(() => Archive.buildRestorePlan([], archive, 'skip-conflicts', {}, [], null, 'owner-b'), /different account/i);
});

test('workspace restore retains the active owner marker when archive metadata is absent', () => {
  const archive = Archive.createWorkspaceArchive([{ id: 'plain', title: 'No owner metadata' }], {}, null);
  const plan = Archive.buildRestorePlan([], archive, 'skip-conflicts', {}, [], null, 'owner-current');
  assert.equal(plan.ownerId, 'owner-current');
});
