import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkspaceArchive,
  validateWorkspaceArchive,
  planWorkspaceArchiveImport,
  applyWorkspaceArchiveImport,
  WORKSPACE_ARCHIVE_STORES
} from './workspace-archive.mjs';

const dossierVersion = {
  id: 'version-1', tensionKey: 'Genesis|1::creation', tensionId: 'tension-1',
  studyPassage: 'Genesis 1', doctrinalClaim: 'Creation', versionNumber: 1,
  savedAt: '2026-11-17T08:00:00.000Z',
  dossier: {
    title: 'Research Conclusion and Resolution Dossier',
    generatedAt: '2026-11-17T08:00:00.000Z',
    passages: [{ label: 'Passage A', reference: 'Genesis 1:1', context: 'Beginning' }],
    evidence: [],
    history: []
  }
};

const sample = () => ({
  drafts: { 'Genesis|1': { observe: 'Observed', interpret: '', doctrine: '', apply: '', activeStage: 'observe' } },
  scriptureMarkup: { 'Genesis|1': { '1': ['key-word'] } },
  wordMarkup: { 'Genesis|1': { '1': [{ start: 0, end: 3, tags: ['key-word'] }] } },
  markupColors: { 'key-word': '#f5e7b9' },
  crossReferences: [{
    id: 'xref-1', sourceBook: 'Genesis', sourceChapter: 1, sourceVerse: 1,
    targetBook: 'John', targetChapter: 1, targetVerse: 1, note: 'Creation connection', createdAt: '2026-11-17T08:00:00.000Z'
  }],
  evidence: [{
    id: 'evidence-1', passageKey: 'Genesis|1', stage: 'interpret', claim: 'Creation',
    reference: 'Genesis 1:1', detail: 'Opening statement', source: 'BSB', createdAt: '2026-11-17T08:00:00.000Z'
  }],
  claimSynthesis: { 'Genesis 1::creation': { status: 'provisional', conclusion: 'Claim', reasoning: 'Reason', updatedAt: '2026-11-17T08:00:00.000Z' } },
  doctrineReviews: { 'Genesis 1::creation': { claimLevel: 'explicit', supportingPassages: 'Genesis 1:1', tensions: '', formulation: 'God created', unresolved: '', approved: false, updatedAt: '2026-11-17T08:00:00.000Z' } },
  theologicalTensions: { 'Genesis|1::creation': [{
    id: 'tension-1', passageA: 'Genesis 1:1', contextA: 'A', passageB: 'John 1:1', contextB: 'B',
    issue: 'Creation', analysis: 'Analysis', uncertainty: 'None',
    assessment: 'complementary', status: 'under_review', updatedAt: '2026-11-17T08:00:00.000Z',
    history: [{ id: 'history-1', recordedAt: '2026-11-17T08:00:00.000Z', eventType: 'initial_position',
      researcherPosition: 'Complementary', rationale: 'Contextual reading', assessment: 'complementary', status: 'under_review' }]
  }] },
  dossierVersions: [dossierVersion]
});

test('exports a versioned workspace archive with exact per-store counts', () => {
  const archive = buildWorkspaceArchive(sample(), { exportedAt: '2026-11-17T08:00:00.000Z' });
  const validated = validateWorkspaceArchive(archive);
  assert.equal(archive.format, 'ibs-workspace-archive');
  assert.equal(archive.archiveVersion, 1);
  assert.equal(validated.counts.dossierVersions, 1);
  assert.equal(validated.counts.theologicalTensions, 1);
  assert.equal(Object.keys(WORKSPACE_ARCHIVE_STORES).length, 10);
});

test('rejects malformed JSON, unsupported versions, count tampering and unknown stores', () => {
  assert.throws(() => validateWorkspaceArchive('{'), /valid JSON/);
  const archive = buildWorkspaceArchive(sample());
  assert.throws(() => validateWorkspaceArchive({ ...archive, archiveVersion: 99 }), /Unsupported/);
  assert.throws(() => validateWorkspaceArchive({ ...archive, counts: { ...archive.counts, evidence: 3 } }), /count/);
  assert.throws(() => validateWorkspaceArchive({ ...archive, stores: { ...archive.stores, surprise: {} } }), /unsupported store/);
});

test('supports the existing dossier-only archive format', () => {
  const legacy = {
    format: 'ibs-theological-dossier-archive', archiveVersion: 1,
    exportedAt: '2026-11-17T08:00:00.000Z', dossierVersionCount: 1,
    dossierVersions: [dossierVersion]
  };
  const validated = validateWorkspaceArchive(legacy);
  assert.equal(validated.kind, 'dossier');
  assert.deepEqual(validated.stores.dossierVersions, [dossierVersion]);
});

test('rejects invalid Scripture references, invalid history, and malformed evidence', () => {
  const archive = buildWorkspaceArchive(sample());
  const badXref = structuredClone(archive);
  badXref.stores.crossReferences[0].sourceChapter = 999;
  assert.throws(() => validateWorkspaceArchive(badXref), /crossReferences/);
  const badHistory = structuredClone(archive);
  badHistory.stores.theologicalTensions['Genesis|1::creation'][0].history[0].eventType = 'invented';
  assert.throws(() => validateWorkspaceArchive(badHistory), /theologicalTensions/);
  const badEvidence = structuredClone(archive);
  badEvidence.stores.evidence[0].stage = 'unknown';
  assert.throws(() => validateWorkspaceArchive(badEvidence), /evidence/);
});

test('preflight distinguishes new, identical and conflicting duplicate records', () => {
  const validated = validateWorkspaceArchive(buildWorkspaceArchive(sample()));
  const current = sample();
  current.evidence[0].detail = 'Changed local detail';
  current.evidence.push({ ...sample().evidence[0], id: 'evidence-existing-identical' });
  const report = planWorkspaceArchiveImport(validated, current);
  assert.equal(report.evidence.conflicting, 1);
  assert.equal(report.evidence.newItems, 0);
  assert.equal(report.dossierVersions.identical, 1);
});

test('merge defaults to keep local conflicts and adds new records', () => {
  const incoming = sample();
  const validated = validateWorkspaceArchive(buildWorkspaceArchive(incoming));
  const current = sample();
  current.evidence = [{ ...current.evidence[0], detail: 'Keep local' }];
  const merged = applyWorkspaceArchiveImport(validated, current);
  assert.equal(merged.evidence[0].detail, 'Keep local');
  assert.equal(merged.evidence.length, 1);
  assert.equal(merged.crossReferences.length, 1);
});

test('explicit replace and duplicate decisions are applied to conflicting IDs', () => {
  const incoming = sample();
  incoming.evidence.push({ ...incoming.evidence[0], id: 'evidence-new', detail: 'New record' });
  const validated = validateWorkspaceArchive(buildWorkspaceArchive(incoming));
  const current = sample();
  current.evidence[0].detail = 'Local value';
  const replaced = applyWorkspaceArchiveImport(validated, current, { 'evidence:evidence-1': 'replace' });
  assert.equal(replaced.evidence[0].detail, 'Opening statement');
  const duplicated = applyWorkspaceArchiveImport(validated, current, { 'evidence:evidence-1': 'duplicate' });
  assert.equal(duplicated.evidence.length, 3);
  assert.notEqual(duplicated.evidence[2].id, 'evidence-1');
});

test('keyed-store conflicts are retained, replaced or duplicated without losing unrelated keys', () => {
  const incoming = sample();
  const validated = validateWorkspaceArchive(buildWorkspaceArchive(incoming));
  const current = sample();
  current.claimSynthesis['Genesis 1::creation'].conclusion = 'Local claim';
  current.claimSynthesis.other = { status: 'under_review', conclusion: 'Keep', reasoning: '', updatedAt: '' };
  const merged = applyWorkspaceArchiveImport(validated, current, { 'claimSynthesis:Genesis 1::creation': 'replace' });
  assert.equal(merged.claimSynthesis['Genesis 1::creation'].conclusion, 'Claim');
  assert.equal(merged.claimSynthesis.other.conclusion, 'Keep');
});

test('replace mode requires explicit conflict resolution and does not mutate the input', () => {
  const incoming = sample();
  const validated = validateWorkspaceArchive(buildWorkspaceArchive(incoming));
  const current = sample();
  current.evidence[0].detail = 'Local edit';
  assert.throws(() => applyWorkspaceArchiveImport(validated, current, {}, 'replace'), /Resolve every duplicate conflict/);
  const result = applyWorkspaceArchiveImport(validated, current, { 'evidence:evidence-1': 'replace' }, 'replace');
  assert.equal(result.evidence[0].detail, 'Opening statement');
  assert.equal(current.evidence[0].detail, 'Local edit');
});

test('preserves unknown extension properties inside validated research records', () => {
  const archive = buildWorkspaceArchive(sample());
  archive.stores.theologicalTensions['Genesis|1::creation'][0].futureExtension = { retained: true };
  const validated = validateWorkspaceArchive(archive);
  const restored = applyWorkspaceArchiveImport(validated, {});
  assert.deepEqual(restored.theologicalTensions['Genesis|1::creation'][0].futureExtension, { retained: true });
});
