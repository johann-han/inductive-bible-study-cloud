const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function functionSource(name) {
  const start = app.indexOf('    function ' + name + '(');
  assert.notEqual(start, -1, 'Expected function ' + name + ' to exist');
  const openingBrace = app.indexOf('{', start);
  assert.notEqual(openingBrace, -1, 'Expected a function body for ' + name);
  let depth = 0;
  for (let i = openingBrace; i < app.length; i++) {
    if (app[i] === '{') depth++;
    else if (app[i] === '}') {
      depth--;
      if (depth === 0) return app.slice(start, i + 1).trim();
    }
  }
  assert.fail('Unclosed function body for ' + name);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('evidence-link normalization validates stages, requires source identity and removes duplicates', () => {
  const normalizeSource = functionSource('normalizeStudyEvidenceLinks');
  const normalize = vm.runInNewContext('(' + normalizeSource + ')', {
    NOTE_SECTION_LABELS: {
      observe: 'Observe',
      interpret: 'Interpret',
      doctrine: 'Doctrine',
      apply: 'Discipleship'
    }
  });

  const result = plain(normalize([
    {
      id: 'link-1',
      sourceId: 'verse-map-11',
      sourceType: 'verse-map',
      sourceTitle: 'Verse map · Ephesians 4:11',
      sourceStage: 'observe',
      sourceReference: 'Ephesians 4:11',
      targetStage: 'interpret',
      linkedAt: '2026-11-08T12:00:00.000Z'
    },
    {
      id: 'duplicate-link',
      sourceId: 'verse-map-11',
      sourceType: 'verse-map',
      sourceTitle: 'Duplicate',
      targetStage: 'interpret'
    },
    {
      sourceId: 'invalid-stage',
      sourceType: 'stage-notes',
      targetStage: 'application'
    },
    {
      sourceId: '',
      sourceType: 'stage-notes',
      targetStage: 'doctrine'
    },
    null,
    []
  ]));

  assert.equal(result.length, 1);
  assert.equal(result[0].sourceId, 'verse-map-11');
  assert.equal(result[0].targetStage, 'interpret');
  assert.equal(result[0].sourceStage, 'observe');
  assert.equal(result[0].sourceReference, 'Ephesians 4:11');
});

test('evidence source descriptors use stable IDs and passage-level granularity', () => {
  const source = functionSource('getWorkspaceEvidenceHandoffSources');
  for (const required of [
    "add('stage-' + stage, 'stage-notes'",
    "'passage-outline', 'passage-outline'",
    "'scripture-markup-' + rawId",
    "'verse-map-' + verse",
    "'related-passage-' + itemId",
    "'verse-cross-reference-' + rawId",
    'sourceStage:',
    'reference:'
  ]) {
    assert.ok(source.includes(required), 'Evidence source collector is missing ' + required);
  }

  assert.ok(source.includes('if (itemStageIndex > Math.max(0, stageIndex)) return;'),
    'Evidence created in a later stage must not flow backwards');
  assert.ok(source.includes('if (item.includedInStageNotes) return;'),
    'Related passage text already present in the source-stage notes must not be duplicated');
});

test('generated evidence blocks include the source ID, type, origin and biblical reference', () => {
  const source = functionSource('insertWorkspaceEvidenceHandoff');
  for (const required of [
    "'--- SOURCE: ' + source.title + ' ---'",
    "'Source ID: ' + source.id",
    "'Source type: ' + source.type",
    "'Origin: '",
    "'Reference: '",
    'record.evidenceLinks = nextEvidenceLinks'
  ]) {
    assert.ok(source.includes(required), 'Generated handoff is missing ' + required);
  }
  assert.ok(source.includes("link.targetStage !== stage"),
    'Refreshing one stage must preserve evidence links for every other stage');
});

test('evidence preview exposes source metadata as text, not interpreted HTML', () => {
  const source = functionSource('renderWorkspaceEvidenceHandoff');
  assert.ok(source.includes('source.id'));
  assert.ok(source.includes('source.type'));
  assert.ok(source.includes('source.sourceStage'));
  assert.ok(source.includes('source.reference'));
  assert.ok(source.includes('origin.textContent = originParts.join'));
  assert.ok(source.includes('body.textContent = source.content'));
  assert.ok(!source.includes('innerHTML'));
});

test('Supabase cloud conversion and merge preserve structured evidence links', () => {
  const rowToRecord = functionSource('cloudRowToRecord');
  assert.ok(rowToRecord.includes('evidenceLinks: normalizeStudyEvidenceLinks(row.sections?._evidenceLinks)'));

  assert.ok(app.includes('evidenceLinks = normalizeStudyEvidenceLinks(rec.evidenceLinks)'));
  assert.ok(app.includes('evidenceLinks = []'));
  assert.ok(app.includes('versionHistory, evidenceLinks, studyClaims, stageReviews }'));
  assert.ok(app.includes('_evidenceLinks: evidenceLinks'));
  assert.ok(app.includes('normalizeStudyEvidenceLinks(remote.sections?._evidenceLinks)'));
  assert.ok(app.includes('normalizeStudyEvidenceLinks(nextRow.sections?._evidenceLinks)'));
});

test('provenance is stored in the existing study-record JSON payload without a table migration', () => {
  assert.ok(app.includes("from('study_records')"));
  assert.ok(app.includes('_evidenceLinks: evidenceLinks'));
  assert.ok(!app.includes('create table public.study_evidence_links'));
  assert.ok(!app.includes('ALTER TABLE public.study_records'));
});
