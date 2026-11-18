import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPreviewWorkspaceArchive,
  WORKSPACE_EXPORT_STORES
} from './workspace-export.mjs';

function storageFrom(values = {}) {
  const map = new Map(Object.entries(values));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    }
  };
}

test('exports all ten PR #187 stores with importer-compatible counts', () => {
  const storage = storageFrom({
    [WORKSPACE_EXPORT_STORES.deletedStudies]: JSON.stringify([{ id: 'deleted-1', book: 'Genesis', chapter: 1, deletedAt: '2026-11-18T08:00:00.000Z', record: { observe: 'Retained in trash' } }]),
    [WORKSPACE_EXPORT_STORES.drafts]: JSON.stringify({
      'Genesis|1': { observe: 'Observation', interpret: '', doctrine: '', apply: '', activeStage: 'observe' }
    }),
    [WORKSPACE_EXPORT_STORES.scriptureMarkup]: JSON.stringify({
      'Genesis|1': { '1': ['key-word'], '2': ['contrast'] }
    }),
    [WORKSPACE_EXPORT_STORES.wordMarkup]: JSON.stringify({
      'Genesis|1': { '1': [{ start: 0, end: 3, tags: ['key-word'] }] }
    }),
    [WORKSPACE_EXPORT_STORES.markupColors]: JSON.stringify({ 'key-word': '#f5e7b9' }),
    [WORKSPACE_EXPORT_STORES.crossReferences]: JSON.stringify([{ id: 'xref-1' }]),
    [WORKSPACE_EXPORT_STORES.evidence]: JSON.stringify([{ id: 'evidence-1' }, { id: 'evidence-2' }]),
    [WORKSPACE_EXPORT_STORES.claimSynthesis]: JSON.stringify({ 'Genesis 1::creation': { conclusion: 'Creation' } }),
    [WORKSPACE_EXPORT_STORES.doctrineReviews]: JSON.stringify({ 'Genesis 1::creation': { formulation: 'God created' } }),
    [WORKSPACE_EXPORT_STORES.theologicalTensions]: JSON.stringify({
      'Genesis|1::creation': [{ id: 'tension-1' }, { id: 'tension-2' }]
    }),
    [WORKSPACE_EXPORT_STORES.dossierVersions]: JSON.stringify([{ id: 'dossier-1' }])
  });

  const archive = buildPreviewWorkspaceArchive(storage, { exportedAt: '2026-11-17T08:00:00.000Z' });

  assert.equal(archive.format, 'ibs-workspace-archive');
  assert.equal(archive.archiveVersion, 1);
  assert.equal(archive.exportedAt, '2026-11-17T08:00:00.000Z');
  assert.equal(Object.keys(archive.stores).length, 11);
  assert.deepEqual(archive.counts, {
    drafts: 1,
    deletedStudies: 1,
    scriptureMarkup: 2,
    wordMarkup: 1,
    markupColors: 1,
    crossReferences: 1,
    evidence: 2,
    claimSynthesis: 1,
    doctrineReviews: 1,
    theologicalTensions: 2,
    dossierVersions: 1
  });
});

test('includes absent stores as explicit empty values and does not omit defaults', () => {
  const archive = buildPreviewWorkspaceArchive(storageFrom());
  assert.deepEqual(archive.stores.drafts, {});
  assert.deepEqual(archive.stores.deletedStudies, []);
  assert.deepEqual(archive.stores.scriptureMarkup, {});
  assert.deepEqual(archive.stores.crossReferences, []);
  assert.deepEqual(archive.stores.evidence, []);
  assert.deepEqual(archive.stores.dossierVersions, []);
  assert.equal(Object.keys(archive.stores).length, 11);
  assert.ok(Object.values(archive.counts).every(count => count === 0));
});

test('preserves stored data exactly and does not write back to browser storage', () => {
  const draft = { observe: 'Original wording', customExtension: { retained: true } };
  const storage = storageFrom({
    [WORKSPACE_EXPORT_STORES.drafts]: JSON.stringify({ 'John|1': draft })
  });
  const archive = buildPreviewWorkspaceArchive(storage);
  assert.deepEqual(archive.stores.drafts['John|1'], draft);
  assert.deepEqual(JSON.parse(storage.getItem(WORKSPACE_EXPORT_STORES.drafts)), { 'John|1': draft });
});

test('stops on malformed JSON or invalid store container shapes instead of silently omitting data', () => {
  const malformed = storageFrom({ [WORKSPACE_EXPORT_STORES.drafts]: '{' });
  assert.throws(() => buildPreviewWorkspaceArchive(malformed), /invalid JSON/);

  const invalidShape = storageFrom({ [WORKSPACE_EXPORT_STORES.evidence]: JSON.stringify({ unexpected: true }) });
  assert.throws(() => buildPreviewWorkspaceArchive(invalidShape), /not an array/);
});

test('rejects an invalid export timestamp and unavailable storage', () => {
  assert.throws(() => buildPreviewWorkspaceArchive(storageFrom(), { exportedAt: 'not-a-date' }), /timestamp/);
  assert.throws(() => buildPreviewWorkspaceArchive(null), /unavailable/);
});
