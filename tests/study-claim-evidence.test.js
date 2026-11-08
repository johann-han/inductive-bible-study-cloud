const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function functionSource(name) {
  let start = app.indexOf('    function ' + name + '(');
  const asyncStart = app.indexOf('    async function ' + name + '(');
  if (start < 0 || (asyncStart >= 0 && asyncStart < start)) start = asyncStart;
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

const labels = {
  observe: 'Observe',
  interpret: 'Interpret',
  doctrine: 'Doctrine',
  apply: 'Discipleship'
};
const relationships = {
  'direct-support': 'Direct textual support',
  'contextual-support': 'Contextual support',
  corroborating: 'Corroborating Scripture',
  inference: 'Inference to assess'
};

test('claim normalization validates stages, source relationships and stable identities', () => {
  const normalize = vm.runInNewContext('(' + functionSource('normalizeStudyClaims') + ')', {
    NOTE_SECTION_LABELS: labels,
    CLAIM_EVIDENCE_RELATIONSHIPS: relationships
  });
  const result = JSON.parse(JSON.stringify(normalize([
    {
      id: 'claim-1',
      stage: 'interpret',
      statement: 'The author connects the command with the preceding promise.',
      supportLinks: [
        {
          sourceId: 'verse-map-4',
          sourceType: 'verse-map',
          sourceTitle: 'Verse map · Ephesians 4:4',
          sourceStage: 'observe',
          sourceReference: 'Ephesians 4:4',
          relationship: 'direct-support',
          linkedAt: '2026-11-08T10:00:00.000Z'
        },
        {
          sourceId: 'primary-passage-ephesians-4',
          sourceType: 'primary-scripture',
          sourceTitle: 'Primary Scripture passage · Ephesians 4',
          sourceReference: 'Ephesians 4',
          relationship: 'inference',
          linkedAt: '2026-11-08T10:00:00.000Z'
        }
      ],
      createdAt: '2026-11-08T10:00:00.000Z'
    },
    {
      id: 'claim-duplicate',
      stage: 'interpret',
      statement: 'The author connects the command with the preceding promise.',
      supportLinks: [{
        sourceId: 'another-source',
        sourceType: 'passage-outline',
        relationship: 'direct-support'
      }]
    },
    {
      id: 'claim-bad-stage',
      stage: 'application',
      statement: 'This claim has an unsupported stage.',
      supportLinks: [{ sourceId: 'x', sourceType: 'y', relationship: 'direct-support' }]
    },
    {
      id: 'claim-bad-relation',
      stage: 'doctrine',
      statement: 'This claim has no valid source relationship.',
      supportLinks: [{ sourceId: 'x', sourceType: 'y', relationship: 'invented' }]
    },
    null
  ])));

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'claim-1');
  assert.equal(result[0].supportLinks.length, 2);
  assert.equal(result[0].supportLinks[0].relationship, 'direct-support');
  assert.equal(result[0].supportLinks[1].relationship, 'inference');
  assert.equal(result[0].supportLinks[1].sourceStage, null);
});

test('claim source collection includes the primary passage and specific supporting sources', () => {
  const source = functionSource('getWorkspaceEvidenceHandoffSources');
  assert.ok(source.includes("'primary-passage-' + passageId"));
  assert.ok(source.includes("'primary-scripture'"));
  assert.ok(source.includes('Primary Scripture passage'));
  assert.ok(source.includes("'verse-map-' + verse"));
  assert.ok(source.includes("'scripture-markup-' + rawId"));
  assert.ok(source.includes("'related-passage-' + itemId"));
  assert.ok(source.includes("'verse-cross-reference-' + rawId"));
  assert.ok(source.includes('sourceStage:'));
  assert.ok(source.includes('reference:'));
});

test('selection capture rejects empty and generated handoff text but accepts a student statement', () => {
  const area = {
    value: 'My own interpretive observation.\n[[IBS_EVIDENCE_HANDOFF_START:interpret]]generated source[[IBS_EVIDENCE_HANDOFF_END:interpret]]',
    selectionStart: 0,
    selectionEnd: 32
  };
  const elements = {
    workspaceNoteArea: area,
    workspaceClaimDraftStatus: { textContent: '' },
    workspaceClaimEvidencePanel: { open: false }
  };
  const state = { stage: null, statement: '' };
  let rendered = 0;
  const sandbox = {
    document: { getElementById: id => elements[id] || null },
    appState: { activeNotesSection: 'interpret' },
    NOTE_SECTION_LABELS: labels,
    workspaceClaimEvidenceState: state,
    renderWorkspaceClaimEvidencePanel: () => { rendered++; }
  };
  const capture = vm.runInNewContext('(' + functionSource('captureWorkspaceClaimSelection') + ')', sandbox);

  area.selectionStart = area.value.indexOf('generated');
  area.selectionEnd = area.value.indexOf('generated') + 'generated source'.length;
  assert.equal(capture(), false);
  assert.match(elements.workspaceClaimDraftStatus.textContent, /generated evidence block/);

  area.selectionStart = 0;
  area.selectionEnd = 'My own interpretive observation.'.length;
  assert.equal(capture(), true);
  assert.equal(state.stage, 'interpret');
  assert.equal(state.statement, 'My own interpretive observation.');
  assert.equal(elements.workspaceClaimEvidencePanel.open, true);
  assert.equal(rendered, 1);
});

test('saving selected claim links stores each source relationship without rewriting note text', () => {
  const originalNotes = 'The author connects the command with the preceding promise.';
  const record = {
    book: 'Ephesians',
    chapter: 4,
    sections: { observe: 'Repeated terms and structure.', interpret: originalNotes, doctrine: '', apply: '' },
    studyClaims: [],
    updatedAt: '2026-11-08T10:00:00.000Z'
  };
  const library = { 'Ephesians::4': record };
  const sourceContainer = {
    querySelectorAll(selector) {
      if (selector === 'input[data-claim-source="true"]:checked') {
        return [
          { dataset: { sourceId: 'verse-map-4' } },
          { dataset: { sourceId: 'primary-passage-ephesians-4' } }
        ];
      }
      if (selector === 'select[data-claim-relationship="true"]') {
        return [
          { dataset: { sourceId: 'verse-map-4' }, value: 'direct-support' },
          { dataset: { sourceId: 'primary-passage-ephesians-4' }, value: 'inference' }
        ];
      }
      return [];
    }
  };
  const status = { textContent: '' };
  const noteStatus = { textContent: '' };
  const draftStatus = { textContent: '' };
  const elements = {
    workspaceClaimEvidenceStatus: status,
    workspaceClaimEvidenceSources: sourceContainer,
    noteSaveStatus: noteStatus,
    workspaceClaimDraftStatus: draftStatus
  };
  const state = { stage: 'interpret', statement: originalNotes };
  const syncState = { user: null };
  let syncCalls = 0;
  let panelRenders = 0;
  let handoffRenders = 0;
  const sourceList = [
    {
      id: 'primary-passage-ephesians-4',
      type: 'primary-scripture',
      title: 'Primary Scripture passage · Ephesians 4',
      sourceStage: null,
      reference: 'Ephesians 4',
      content: 'Primary passage'
    },
    {
      id: 'verse-map-4',
      type: 'verse-map',
      title: 'Verse map · Ephesians 4:4',
      sourceStage: 'observe',
      reference: 'Ephesians 4:4',
      content: 'Verse map details'
    }
  ];
  const sandbox = {
    document: { getElementById: id => elements[id] || null },
    NOTE_SECTION_LABELS: labels,
    CLAIM_EVIDENCE_RELATIONSHIPS: relationships,
    appState: { activeNotesSection: 'interpret' },
    workspaceClaimEvidenceState: state,
    cloudSyncState: syncState,
    saveActiveStudyNote() {},
    readStudyLibrary: () => library,
    writeStudyLibrary: value => { Object.assign(library, value); return true; },
    studyRecordKey: () => 'Ephesians::4',
    getWorkspaceEvidenceHandoffSources: () => sourceList,
    normalizeStudyClaims: value => {
      const seen = new Set();
      return (Array.isArray(value) ? value : []).filter(claim => {
        const key = claim.stage + '::' + claim.statement;
        if (seen.has(key) || !claim.supportLinks?.length) return false;
        seen.add(key);
        return true;
      });
    },
    scheduleCloudStudySync: () => { syncCalls++; },
    renderWorkspaceClaimEvidencePanel: () => { panelRenders++; },
    renderWorkspaceEvidenceHandoff: () => { handoffRenders++; },
    Date,
    Math
  };
  const save = vm.runInNewContext('(' + functionSource('saveWorkspaceClaimEvidenceLinks') + ')', sandbox);

  assert.equal(save(), true);
  assert.equal(record.sections.interpret, originalNotes);
  assert.equal(record.studyClaims.length, 1);
  assert.equal(record.studyClaims[0].statement, originalNotes);
  assert.equal(record.studyClaims[0].supportLinks.length, 2);
  assert.equal(record.studyClaims[0].supportLinks.find(link => link.sourceId === 'verse-map-4').relationship, 'direct-support');
  assert.equal(record.studyClaims[0].supportLinks.find(link => link.sourceId === 'primary-passage-ephesians-4').relationship, 'inference');
  assert.equal(state.statement, '');
  assert.equal(syncCalls, 1);
  assert.equal(panelRenders, 1);
  assert.equal(handoffRenders, 1);
  assert.match(status.textContent, /2 source links saved/);
});

test('claim cards mark changed statements for review and never remove the note itself', () => {
  const render = functionSource('renderWorkspaceClaimEvidencePanel');
  assert.ok(render.includes("String(noteSections[claim.stage] || '').includes(claim.statement)"));
  assert.ok(render.includes('statement changed or moved; review this link'));
  assert.ok(render.includes('Remove evidence links only; leave the note text unchanged'));
  const remove = functionSource('removeWorkspaceStudyClaim');
  assert.ok(remove.includes('record.studyClaims = nextClaims'));
  assert.ok(remove.includes('The statement remains in your notes.'));
});

test('claim and evidence links persist through cloud sync and full backup/restore', () => {
  const cloudRow = functionSource('cloudRowToRecord');
  assert.ok(cloudRow.includes('studyClaims: normalizeStudyClaims(row.sections?._studyClaims)'));
  assert.ok(app.includes('studyClaims = normalizeStudyClaims(rec.studyClaims)'));
  assert.ok(app.includes('_studyClaims: studyClaims'));
  assert.ok(app.includes('normalizeStudyClaims(remote.sections?._studyClaims)'));
  assert.ok(app.includes('normalizeStudyClaims(nextRow.sections?._studyClaims)'));

  const backupExport = functionSource('exportFullStudyBackup');
  assert.ok(backupExport.includes('studyClaims: normalizeStudyClaims(record.studyClaims)'));
  assert.ok(backupExport.includes('evidenceLinks: normalizeStudyEvidenceLinks(record.evidenceLinks)'));
  const backupRestore = functionSource('restoreFullStudyBackup');
  assert.ok(backupRestore.includes('normalizeStudyClaims(item.studyClaims)'));
  assert.ok(backupRestore.includes('normalizeStudyEvidenceLinks(item.evidenceLinks)'));
  assert.ok(backupRestore.includes('normalizeStudyClaims(current?.studyClaims)'));
  assert.ok(backupRestore.includes('normalizeStudyEvidenceLinks(current?.evidenceLinks)'));
});

test('older study backups without claims or provenance preserve current links', () => {
  const restore = functionSource('restoreFullStudyBackup');
  assert.ok(restore.includes("if (!Object.prototype.hasOwnProperty.call(incoming, 'studyClaims')) incoming.studyClaims = normalizeStudyClaims(current?.studyClaims)"));
  assert.ok(restore.includes("if (!Object.prototype.hasOwnProperty.call(incoming, 'evidenceLinks')) incoming.evidenceLinks = normalizeStudyEvidenceLinks(current?.evidenceLinks)"));
});

