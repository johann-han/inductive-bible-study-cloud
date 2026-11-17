import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComparisonPassageImport } from '../next-app/src/lib/theological-tensions.mjs';

test('comparison passage import retains its reference, exact text and translation source', () => {
  assert.deepEqual(buildComparisonPassageImport({
    reference: 'John 1:1-3',
    text: '1. In the beginning was the Word. 2. He was with God.',
    source: 'Berean Standard Bible'
  }), {
    reference: 'John 1:1-3',
    context: '1. In the beginning was the Word. 2. He was with God.\n\nText source: Berean Standard Bible'
  });
});

test('comparison passage import trims surrounding whitespace and permits an absent source label', () => {
  assert.deepEqual(buildComparisonPassageImport({
    reference: '  Romans 8  ',
    text: '  There is therefore now no condemnation.  '
  }), { reference: 'Romans 8', context: 'There is therefore now no condemnation.' });
});

test('comparison passage import rejects missing or incomplete comparison data', () => {
  assert.throws(() => buildComparisonPassageImport(null), /comparison result is required/);
  assert.throws(() => buildComparisonPassageImport({ text: 'Verse text' }), /Scripture reference/);
  assert.throws(() => buildComparisonPassageImport({ reference: 'John 1' }), /Scripture text/);
});


import {
  listTheologicalTensionRecords,
  filterTheologicalTensionRecords
} from '../next-app/src/lib/theological-tensions.mjs';

const sampleTensions = {
  'Genesis|1::god creates': [
    {
      id: 'gen-1', passageA: 'Genesis 1:1', contextA: 'Creation account',
      passageB: 'John 1:1', contextB: 'Prologue',
      issue: 'Creation and the Word', analysis: 'Comparison still open',
      uncertainty: 'Historical setting', assessment: 'apparent_tension',
      status: 'under_review', updatedAt: '2026-11-16T10:00:00Z'
    }
  ],
  'Romans|3::justification': [
    {
      id: 'rom-1', passageA: 'Romans 3:28', contextA: 'Paul on works of law',
      passageB: 'James 2:24', contextB: 'James on works',
      issue: 'Faith and works', analysis: 'Need to compare usage',
      uncertainty: '', assessment: 'unresolved',
      status: 'open', updatedAt: '2026-11-17T10:00:00Z'
    },
    { id: '', issue: 'invalid row' }
  ],
  malformed: 'not-an-array'
};

test('study-wide tension index retains claim and passage identity and sorts newest first', () => {
  const rows = listTheologicalTensionRecords(sampleTensions);
  assert.deepEqual(rows.map(row => row.id), ['rom-1', 'gen-1']);
  assert.equal(rows[0].studyKey, 'Romans|3');
  assert.equal(rows[0].studyPassage, 'Romans 3');
  assert.equal(rows[0].claimKey, 'justification');
  assert.equal(rows[1].reviewKey, 'Genesis|1::god creates');
});

test('study-wide tension index safely handles malformed or empty storage values', () => {
  assert.deepEqual(listTheologicalTensionRecords(null), []);
  assert.deepEqual(listTheologicalTensionRecords([]), []);
  assert.deepEqual(listTheologicalTensionRecords({ 'John|1::word': [null, {}, { id: 4 }] }), []);
});

test('tension filters can combine assessment, status and free-text search', () => {
  const rows = listTheologicalTensionRecords(sampleTensions);
  assert.deepEqual(
    filterTheologicalTensionRecords(rows, { assessment: 'unresolved', status: 'open', search: 'James 2:24' }).map(row => row.id),
    ['rom-1']
  );
  assert.deepEqual(
    filterTheologicalTensionRecords(rows, { assessment: 'apparent_tension' }).map(row => row.id),
    ['gen-1']
  );
  assert.deepEqual(
    filterTheologicalTensionRecords(rows, { search: 'creation account' }).map(row => row.id),
    ['gen-1']
  );
});

test('tension filters return no entries for unmatched criteria and ignore malformed inputs', () => {
  const rows = listTheologicalTensionRecords(sampleTensions);
  assert.deepEqual(filterTheologicalTensionRecords(rows, { status: 'researcher_resolved' }), []);
  assert.deepEqual(filterTheologicalTensionRecords(null), []);
});


import { appendTheologicalTensionHistory } from '../next-app/src/lib/theological-tensions.mjs';

const historyRecord = {
  id: 'tension-history-test',
  passageA: 'Romans 3:28',
  contextA: 'Paul addresses works of the law in his argument about justification.',
  passageB: 'James 2:24',
  contextB: 'James addresses a claim to faith that has no works.',
  issue: 'How faith and works relate in each argument.',
  analysis: 'The terms and contexts require further comparison.',
  uncertainty: 'The relationship between the authors’ uses of “works” remains under examination.',
  assessment: 'unresolved',
  status: 'under_review',
  updatedAt: '2026-11-17T06:00:00.000Z'
};

test('first history checkpoint records a complete dated snapshot without mutating the live record', () => {
  const first = appendTheologicalTensionHistory(historyRecord, {
    eventType: 'initial_position',
    rationale: 'Record the first considered position before further study.',
    researcherPosition: 'The passages may address different questions; this remains provisional.',
    evidenceConsidered: 'Romans 3:28 and James 2:24 in their immediate paragraphs.'
  }, { id: 'history-1', recordedAt: '2026-11-17T07:00:00.000Z' });

  assert.equal(historyRecord.history, undefined);
  assert.equal(first.history.length, 1);
  assert.equal(first.history[0].previousAssessment, null);
  assert.equal(first.history[0].previousStatus, null);
  assert.equal(first.history[0].assessment, 'unresolved');
  assert.equal(first.history[0].status, 'under_review');
  assert.equal(first.history[0].passageA, 'Romans 3:28');
  assert.equal(first.history[0].analysisSnapshot, historyRecord.analysis);
  assert.equal(first.history[0].rationale, 'Record the first considered position before further study.');
  assert.equal(first.updatedAt, '2026-11-17T07:00:00.000Z');
});

test('subsequent history checkpoints retain prior entries and record the previous assessment and status', () => {
  const first = appendTheologicalTensionHistory(historyRecord, {
    eventType: 'initial_position',
    rationale: 'Initial reading.',
    researcherPosition: 'Question remains open.'
  }, { id: 'history-1', recordedAt: '2026-11-17T07:00:00.000Z' });
  const revisedRecord = {
    ...first,
    assessment: 'complementary',
    status: 'provisionally_addressed',
    analysis: 'A later review suggests the authors address different aspects of the subject.'
  };
  const second = appendTheologicalTensionHistory(revisedRecord, {
    eventType: 'interpretive_revision',
    rationale: 'The wider arguments and use of “works” have now been examined.',
    researcherPosition: 'The passages appear to be complementary, subject to further verification.',
    evidenceConsidered: 'Romans 3–4 and James 2 in context.'
  }, { id: 'history-2', recordedAt: '2026-11-17T08:00:00.000Z' });

  assert.equal(second.history.length, 2);
  assert.equal(second.history[0].id, 'history-1');
  assert.equal(second.history[1].previousAssessment, 'unresolved');
  assert.equal(second.history[1].assessment, 'complementary');
  assert.equal(second.history[1].previousStatus, 'under_review');
  assert.match(second.history[1].previousResearcherPosition, /Question remains open/);
  assert.equal(second.history[1].previousAnalysisSnapshot, historyRecord.analysis);
  assert.equal(second.history[1].previousUncertaintySnapshot, historyRecord.uncertainty);
  assert.equal(second.history[1].status, 'provisionally_addressed');
  assert.match(second.history[1].analysisSnapshot, /different aspects/);
  assert.equal(first.history.length, 1);
});

test('history requires an event type, rationale, interpretive position, unique ID and valid timestamp', () => {
  const validInput = {
    eventType: 'other',
    rationale: 'A documented reason.',
    researcherPosition: 'A current position.'
  };
  assert.throws(() => appendTheologicalTensionHistory(historyRecord, null, { id: 'h', recordedAt: '2026-11-17T07:00:00Z' }), /history entry is required/);
  assert.throws(() => appendTheologicalTensionHistory(historyRecord, { ...validInput, eventType: 'invented' }, { id: 'h', recordedAt: '2026-11-17T07:00:00Z' }), /event type/);
  assert.throws(() => appendTheologicalTensionHistory(historyRecord, { ...validInput, rationale: ' ' }, { id: 'h', recordedAt: '2026-11-17T07:00:00Z' }), /Explain why/);
  assert.throws(() => appendTheologicalTensionHistory(historyRecord, { ...validInput, researcherPosition: '' }, { id: 'h', recordedAt: '2026-11-17T07:00:00Z' }), /interpretive position/);
  assert.throws(() => appendTheologicalTensionHistory(historyRecord, validInput, { id: '', recordedAt: '2026-11-17T07:00:00Z' }), /unique history entry ID/);
  assert.throws(() => appendTheologicalTensionHistory(historyRecord, validInput, { id: 'h', recordedAt: 'invalid' }), /valid history timestamp/);
});

test('history is append-only and rejects reuse of an existing checkpoint ID', () => {
  const first = appendTheologicalTensionHistory(historyRecord, {
    eventType: 'initial_position',
    rationale: 'Initial checkpoint.',
    researcherPosition: 'Initial view.'
  }, { id: 'fixed-id', recordedAt: '2026-11-17T07:00:00Z' });
  assert.throws(() => appendTheologicalTensionHistory(first, {
    eventType: 'other',
    rationale: 'Attempt duplicate.',
    researcherPosition: 'Another view.'
  }, { id: 'fixed-id', recordedAt: '2026-11-17T08:00:00Z' }), /IDs must be unique/);
  assert.equal(first.history.length, 1);
});


import { buildTheologicalTensionDossier } from '../next-app/src/lib/theological-tensions.mjs';

test('research dossier assembles current passages, resolution, doctrine review, evidence and full history', () => {
  const record = {
    id: 'dossier-1',
    studyKey: 'Romans|3',
    studyPassage: 'Romans 3',
    claimKey: 'justification',
    claimDisplay: 'Justification and works',
    passageA: 'Romans 3:28',
    contextA: 'Paul’s argument about justification and works of the law.',
    passageB: 'James 2:24',
    contextB: 'James addresses a claim to faith without works.',
    issue: 'The apparent relationship between faith, works and justification.',
    analysis: 'The authors’ arguments and uses of works have been compared.',
    uncertainty: 'The full relationship requires continued contextual examination.',
    resolution: 'The passages address distinct aspects of the relationship between faith and works.',
    resolutionRationale: 'The researcher considers each author’s immediate argument and audience.',
    assessment: 'complementary',
    status: 'provisionally_addressed',
    history: [
      {
        id: 'history-1', recordedAt: '2026-11-17T07:00:00.000Z',
        eventType: 'initial_position', previousAssessment: null, assessment: 'unresolved',
        previousStatus: null, status: 'under_review',
        previousResearcherPosition: null, previousAnalysisSnapshot: null, previousUncertaintySnapshot: null,
        previousResolution: null, resolutionSnapshot: '',
        resolutionRationaleSnapshot: '',
        passageA: 'Romans 3:28', contextA: 'Earlier contextual note.',
        passageB: 'James 2:24', contextB: 'Earlier contextual note.',
        issue: 'Faith and works', researcherPosition: 'The relationship remains open.',
        analysisSnapshot: 'Initial reading.', evidenceConsidered: 'Romans 3 and James 2.',
        uncertaintySnapshot: 'Meaning of works.', rationale: 'Initial review.'
      }
    ]
  };
  const dossier = buildTheologicalTensionDossier(record, {
    generatedAt: '2026-11-17T08:00:00.000Z',
    doctrineReview: { claimLevel: 'broader_inference', formulation: 'A formulation derived from the wider canonical synthesis.', unresolved: 'Scope of the inference.' },
    claimSynthesis: { conclusion: 'Research synthesis.', reasoning: 'Evidence was weighed in context.' },
    evidenceRecords: [{
      kind: 'Scripture', reference: 'Romans 3:28', detail: 'Textual evidence detail.',
      source: 'Berean Standard Bible', relationship: 'supports', sourceQuality: 'strong',
      verificationStatus: 'content_checked', assessmentRationale: 'Direct contextual relevance.',
      verificationRationale: 'Checked against the cited passage.', sourceQualityRationale: 'Primary text.',
      createdAt: '2026-11-17T06:00:00.000Z'
    }]
  });

  assert.equal(dossier.title, 'Research Conclusion and Resolution Dossier');
  assert.equal(dossier.generatedAt, '2026-11-17T08:00:00.000Z');
  assert.equal(dossier.studyPassage, 'Romans 3');
  assert.equal(dossier.doctrinalClaim, 'Justification and works');
  assert.equal(dossier.claimLevel, 'broader_inference');
  assert.equal(dossier.originalSynthesis, 'Research synthesis.');
  assert.equal(dossier.refinedDoctrinalFormulation, 'A formulation derived from the wider canonical synthesis.');
  assert.equal(dossier.researchConclusion, record.resolution);
  assert.equal(dossier.resolutionRationale, record.resolutionRationale);
  assert.equal(dossier.passages[0].reference, 'Romans 3:28');
  assert.equal(dossier.passages[1].reference, 'James 2:24');
  assert.equal(dossier.evidence.length, 1);
  assert.equal(dossier.evidence[0].verificationStatus, 'content_checked');
  assert.equal(dossier.history.length, 1);
  assert.equal(dossier.history[0].researcherPosition, 'The relationship remains open.');
  assert.match(dossier.methodNote, /does not independently verify/);
});

test('research dossier states explicitly when no formal resolution or supporting material exists', () => {
  const dossier = buildTheologicalTensionDossier({
    id: 'dossier-empty',
    studyKey: 'John|1',
    claimKey: 'the word',
    passageA: '',
    contextA: '',
    passageB: '',
    contextB: '',
    issue: '',
    analysis: '',
    uncertainty: '',
    assessment: 'unclassified',
    status: 'open',
    history: []
  }, { generatedAt: '2026-11-17T08:00:00Z' });

  assert.match(dossier.researchConclusion, /No formal research conclusion/);
  assert.match(dossier.passages[0].context, /not recorded/i);
  assert.match(dossier.issue, /No precise point/);
  assert.equal(dossier.evidence.length, 0);
  assert.equal(dossier.history.length, 0);
});

test('research dossier builder rejects invalid tension records', () => {
  assert.throws(() => buildTheologicalTensionDossier(null), /valid theological tension record/);
});
