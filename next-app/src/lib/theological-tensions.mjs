export function buildComparisonPassageImport(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new TypeError('A Scripture comparison result is required.');
  }
  const reference = typeof result.reference === 'string' ? result.reference.trim() : '';
  const text = typeof result.text === 'string' ? result.text.trim() : '';
  const source = typeof result.source === 'string' ? result.source.trim() : '';
  if (!reference) throw new TypeError('The comparison result must include a Scripture reference.');
  if (!text) throw new TypeError('The comparison result must include Scripture text.');
  return {
    reference,
    context: [text, source ? 'Text source: ' + source : ''].filter(Boolean).join('\n\n')
  };
}


export function listTheologicalTensionRecords(tensionMap) {
  if (!tensionMap || typeof tensionMap !== 'object' || Array.isArray(tensionMap)) return [];
  return Object.entries(tensionMap).flatMap(([reviewKey, records]) => {
    if (!Array.isArray(records)) return [];
    const separator = reviewKey.indexOf('::');
    const studyKey = separator >= 0 ? reviewKey.slice(0, separator) : reviewKey;
    const claimKey = separator >= 0 ? reviewKey.slice(separator + 2) : '';
    const [book = '', chapter = ''] = studyKey.split('|');
    return records.filter(record =>
      record && typeof record === 'object' && !Array.isArray(record) &&
      typeof record.id === 'string' && record.id.trim()
    ).map(record => ({
      ...record,
      reviewKey,
      studyKey,
      claimKey,
      studyPassage: book && chapter ? book + ' ' + chapter : studyKey
    }));
  }).sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || '') || 0;
    const rightTime = Date.parse(right.updatedAt || '') || 0;
    return rightTime - leftTime;
  });
}

export function filterTheologicalTensionRecords(records, filters = {}) {
  if (!Array.isArray(records)) return [];
  const search = typeof filters.search === 'string' ? filters.search.trim().toLocaleLowerCase() : '';
  const assessment = typeof filters.assessment === 'string' ? filters.assessment : 'all';
  const status = typeof filters.status === 'string' ? filters.status : 'all';
  return records.filter(record => {
    if (!record || typeof record !== 'object') return false;
    if (assessment !== 'all' && record.assessment !== assessment) return false;
    if (status !== 'all' && record.status !== status) return false;
    if (!search) return true;
    const searchable = [
      record.studyPassage, record.claimKey, record.passageA, record.contextA,
      record.passageB, record.contextB, record.issue, record.analysis, record.uncertainty
    ].filter(value => typeof value === 'string').join(' ').toLocaleLowerCase();
    return searchable.includes(search);
  });
}


const HISTORY_EVENT_TYPES = new Set([
  'initial_position',
  'interpretive_revision',
  'assessment_change',
  'resolution_proposed',
  'resolution_revised',
  'reopened',
  'other'
]);

function cloneHistoryValue(value) {
  return value === undefined ? '' : value;
}

export function appendTheologicalTensionHistory(record, input, metadata = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.id !== 'string' || !record.id.trim()) {
    throw new TypeError('A valid theological tension record is required.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('A history entry is required.');
  }
  const eventType = typeof input.eventType === 'string' ? input.eventType : '';
  if (!HISTORY_EVENT_TYPES.has(eventType)) throw new TypeError('Select a valid history event type.');
  const rationale = typeof input.rationale === 'string' ? input.rationale.trim() : '';
  if (!rationale) throw new TypeError('Explain why this research position is being recorded.');
  const researcherPosition = typeof input.researcherPosition === 'string' ? input.researcherPosition.trim() : '';
  if (!researcherPosition) throw new TypeError('Record the current interpretive position before saving history.');
  const id = typeof metadata.id === 'string' && metadata.id.trim() ? metadata.id.trim() : '';
  if (!id) throw new TypeError('A unique history entry ID is required.');
  const recordedAt = typeof metadata.recordedAt === 'string' && Number.isFinite(Date.parse(metadata.recordedAt))
    ? new Date(metadata.recordedAt).toISOString()
    : '';
  if (!recordedAt) throw new TypeError('A valid history timestamp is required.');

  const existingHistory = Array.isArray(record.history) ? record.history : [];
  if (existingHistory.some(entry => entry && entry.id === id)) throw new TypeError('History entry IDs must be unique within a tension record.');
  const previous = existingHistory.length ? existingHistory[existingHistory.length - 1] : null;
  const entry = Object.freeze({
    id,
    recordedAt,
    eventType,
    previousAssessment: previous?.assessment ?? null,
    assessment: cloneHistoryValue(record.assessment),
    previousStatus: previous?.status ?? null,
    status: cloneHistoryValue(record.status),
    previousResearcherPosition: previous?.researcherPosition ?? null,
    previousAnalysisSnapshot: previous?.analysisSnapshot ?? null,
    previousUncertaintySnapshot: previous?.uncertaintySnapshot ?? null,
    passageA: cloneHistoryValue(record.passageA),
    contextA: cloneHistoryValue(record.contextA),
    passageB: cloneHistoryValue(record.passageB),
    contextB: cloneHistoryValue(record.contextB),
    issue: cloneHistoryValue(record.issue),
    previousResolution: previous?.resolutionSnapshot ?? null,
    resolutionSnapshot: cloneHistoryValue(record.resolution),
    resolutionRationaleSnapshot: cloneHistoryValue(record.resolutionRationale),
    researcherPosition,
    analysisSnapshot: cloneHistoryValue(record.analysis),
    evidenceConsidered: typeof input.evidenceConsidered === 'string' ? input.evidenceConsidered.trim() : '',
    uncertaintySnapshot: cloneHistoryValue(record.uncertainty),
    rationale
  });
  const history = [...existingHistory, entry];
  return { ...record, history, updatedAt: recordedAt };
}


function dossierText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function buildTheologicalTensionDossier(record, options = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.id !== 'string' || !record.id.trim()) {
    throw new TypeError('A valid theological tension record is required to prepare a dossier.');
  }
  const generatedAt = typeof options.generatedAt === 'string' && Number.isFinite(Date.parse(options.generatedAt))
    ? new Date(options.generatedAt).toISOString()
    : new Date().toISOString();
  const review = options.doctrineReview && typeof options.doctrineReview === 'object' ? options.doctrineReview : {};
  const synthesis = options.claimSynthesis && typeof options.claimSynthesis === 'object' ? options.claimSynthesis : {};
  const evidence = Array.isArray(options.evidenceRecords)
    ? options.evidenceRecords.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(item => ({
        kind: dossierText(item.kind, 'Evidence'),
        reference: dossierText(item.reference, 'Reference not recorded'),
        detail: dossierText(item.detail, 'Evidence detail not recorded'),
        source: dossierText(item.source, 'Source not recorded'),
        sourceUrl: dossierText(item.sourceUrl),
        relationship: dossierText(item.relationship, 'context'),
        sourceQuality: dossierText(item.sourceQuality, 'unassessed'),
        verificationStatus: dossierText(item.verificationStatus, 'not_checked'),
        assessmentRationale: dossierText(item.assessmentRationale),
        verificationRationale: dossierText(item.verificationRationale),
        sourceQualityRationale: dossierText(item.sourceQualityRationale),
        createdAt: dossierText(item.createdAt)
      }))
    : [];
  const history = Array.isArray(record.history) ? record.history.map(entry => ({ ...entry })) : [];
  const latestHistory = history.length ? history[history.length - 1] : null;
  const assessment = dossierText(record.assessment, 'unclassified');
  const status = dossierText(record.status, 'open');
  const assessmentLabels = {
    unclassified: 'Not yet classified',
    apparent_tension: 'Apparent tension',
    complementary: 'Complementary perspectives',
    unresolved: 'Unresolved relationship',
    perceived_contradiction: 'Perceived contradiction — further examination required'
  };
  const statusLabels = {
    open: 'Open',
    under_review: 'Under review',
    provisionally_addressed: 'Provisionally addressed',
    researcher_resolved: 'Resolved by researcher'
  };
  return {
    title: 'Research Conclusion and Resolution Dossier',
    generatedAt,
    studyPassage: dossierText(record.studyPassage, dossierText(record.studyKey, 'Study passage not identified')),
    doctrinalClaim: dossierText(record.claimDisplay, dossierText(record.claimKey, 'Claim not recorded')),
    claimLevel: dossierText(review.claimLevel, 'Not classified'),
    claimSynthesisStatus: dossierText(synthesis.status, 'No synthesis status recorded').replaceAll('_', ' '),
    originalSynthesis: dossierText(synthesis.conclusion, 'No claim synthesis recorded'),
    synthesisReasoning: dossierText(synthesis.reasoning, 'No synthesis reasoning recorded'),
    refinedDoctrinalFormulation: dossierText(review.formulation, 'No refined doctrinal formulation recorded'),
    doctrineSupportingPassages: dossierText(review.supportingPassages, 'No supporting Scripture passages recorded in Doctrine review'),
    doctrineCounterTexts: dossierText(review.tensions, 'No counter-texts or qualifications recorded in Doctrine review'),
    doctrineReviewQuestions: dossierText(review.unresolved, 'No Doctrine review questions recorded'),
    doctrineReviewApproved: Boolean(review.approved),
    doctrineReviewUpdatedAt: dossierText(review.updatedAt, 'No Doctrine review timestamp recorded'),
    assessment,
    assessmentLabel: assessmentLabels[assessment] || assessment.replaceAll('_', ' '),
    status,
    statusLabel: statusLabels[status] || status.replaceAll('_', ' '),
    passages: [
      { label: 'Passage A', reference: dossierText(record.passageA, 'Reference not recorded'), context: dossierText(record.contextA, 'Context and meaning not recorded') },
      { label: 'Passage B', reference: dossierText(record.passageB, 'Reference not recorded'), context: dossierText(record.contextB, 'Context and meaning not recorded') }
    ],
    issue: dossierText(record.issue, 'No precise point of tension recorded'),
    interpretiveAnalysis: dossierText(record.analysis, 'No interpretive analysis recorded'),
    currentResearcherPosition: dossierText(latestHistory?.researcherPosition, 'No formal researcher position has been saved in the interpretation history.'),
    researchConclusion: dossierText(record.resolution, 'No formal research conclusion or proposed resolution has been recorded.'),
    resolutionRationale: dossierText(record.resolutionRationale, 'No rationale for the proposed resolution has been recorded.'),
    evidence,
    history,
    remainingUncertainty: dossierText(record.uncertainty, 'No remaining uncertainty has been recorded.'),
    recordUpdatedAt: dossierText(record.updatedAt, 'No record update date available'),
    methodNote: 'This dossier reports the researcher’s recorded work. It does not independently verify the interpretation, decide whether passages contradict one another, or resolve questions left open by the evidence.'
  };
}


function dossierSnapshotCopy(dossier) {
  try {
    return JSON.parse(JSON.stringify(dossier));
  } catch {
    throw new TypeError('The dossier must contain serializable research data.');
  }
}

export function appendTheologicalDossierVersion(existingVersions, input, metadata = {}) {
  const current = Array.isArray(existingVersions) ? existingVersions : [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('A dossier version record is required.');
  }
  const tensionKey = typeof input.tensionKey === 'string' ? input.tensionKey.trim() : '';
  if (!tensionKey) throw new TypeError('The dossier must be linked to its original tension record.');
  const id = typeof metadata.id === 'string' ? metadata.id.trim() : '';
  if (!id) throw new TypeError('A unique dossier version ID is required.');
  if (current.some(version => version && version.id === id)) {
    throw new TypeError('Dossier version IDs must be unique.');
  }
  const savedAt = typeof metadata.savedAt === 'string' && Number.isFinite(Date.parse(metadata.savedAt))
    ? new Date(metadata.savedAt).toISOString()
    : '';
  if (!savedAt) throw new TypeError('A valid dossier save timestamp is required.');
  const dossier = input.dossier && typeof input.dossier === 'object' && !Array.isArray(input.dossier)
    ? dossierSnapshotCopy(input.dossier)
    : null;
  if (!dossier || typeof dossier.title !== 'string' || typeof dossier.generatedAt !== 'string') {
    throw new TypeError('A complete generated dossier snapshot is required.');
  }
  const versionNumber = current.filter(version => version && version.tensionKey === tensionKey)
    .reduce((highest, version) => Math.max(highest, Number(version.versionNumber) || 0), 0) + 1;
  const version = Object.freeze({
    id,
    tensionKey,
    tensionId: typeof input.tensionId === 'string' ? input.tensionId : '',
    studyPassage: dossierText(dossier.studyPassage, 'Study passage not identified'),
    doctrinalClaim: dossierText(dossier.doctrinalClaim, 'Claim not recorded'),
    versionNumber,
    savedAt,
    dossier
  });
  return [...current, version];
}

export function compareTheologicalDossierVersions(left, right) {
  if (!left || typeof left !== 'object' || !right || typeof right !== 'object') {
    throw new TypeError('Choose two saved dossier versions to compare.');
  }
  if (!left.dossier || !right.dossier || typeof left.dossier !== 'object' || typeof right.dossier !== 'object') {
    throw new TypeError('Both selected versions must contain a dossier snapshot.');
  }
  if (left.tensionKey !== right.tensionKey) {
    throw new TypeError('Only versions of the same tension record can be compared.');
  }
  const fields = [
    ['Assessment', 'assessmentLabel'],
    ['Research status', 'statusLabel'],
    ['Claim level', 'claimLevel'],
    ['Original synthesis', 'originalSynthesis'],
    ['Refined doctrinal formulation', 'refinedDoctrinalFormulation'],
    ['Passage A context', 'passages.0.context'],
    ['Passage B context', 'passages.1.context'],
    ['Interpretive analysis', 'interpretiveAnalysis'],
    ['Current researcher position', 'currentResearcherPosition'],
    ['Research conclusion', 'researchConclusion'],
    ['Resolution rationale', 'resolutionRationale'],
    ['Remaining uncertainty', 'remainingUncertainty'],
    ['Linked evidence count', 'evidence.length'],
    ['History checkpoint count', 'history.length']
  ];
  const read = (object, path) => path.split('.').reduce((value, part) => {
    if (value == null) return undefined;
    if (part === 'length') return typeof value.length === 'number' ? value.length : undefined;
    return value[part];
  }, object);
  const changes = fields.map(([label, path]) => ({
    label,
    before: read(left.dossier, path) ?? '',
    after: read(right.dossier, path) ?? '',
    changed: JSON.stringify(read(left.dossier, path) ?? '') !== JSON.stringify(read(right.dossier, path) ?? '')
  }));
  return {
    tensionKey: left.tensionKey,
    leftVersion: Number(left.versionNumber) || 0,
    rightVersion: Number(right.versionNumber) || 0,
    leftSavedAt: left.savedAt || '',
    rightSavedAt: right.savedAt || '',
    changes,
    changedFields: changes.filter(item => item.changed)
  };
}

export function exportTheologicalDossierMarkdown(dossier, archiveMetadata = {}) {
  if (!dossier || typeof dossier !== 'object' || Array.isArray(dossier)) {
    throw new TypeError('A dossier snapshot is required for Markdown export.');
  }
  const section = (heading, value) => '## ' + heading + '\n\n' + dossierText(value, 'Not recorded') + '\n\n';
  const passages = Array.isArray(dossier.passages) ? dossier.passages : [];
  const evidence = Array.isArray(dossier.evidence) ? dossier.evidence : [];
  const history = Array.isArray(dossier.history) ? dossier.history : [];
  const lines = [
    '# ' + dossierText(dossier.title, 'Research Dossier'),
    '',
    '**Study:** ' + dossierText(dossier.studyPassage, 'Not identified'),
    '**Claim:** ' + dossierText(dossier.doctrinalClaim, 'Not recorded'),
    '**Prepared:** ' + dossierText(dossier.generatedAt, 'Date not recorded'),
    ...(Number.isInteger(archiveMetadata.versionNumber) ? ['**Archive version:** ' + archiveMetadata.versionNumber] : []),
    ...(typeof archiveMetadata.savedAt === 'string' && archiveMetadata.savedAt ? ['**Saved to archive:** ' + archiveMetadata.savedAt] : []),
    '',
    section('Research question and scope', dossier.issue),
    section('Original claim synthesis', dossier.originalSynthesis),
    section('Synthesis reasoning', dossier.synthesisReasoning),
    section('Refined doctrinal formulation', dossier.refinedDoctrinalFormulation),
    '## Scripture passages examined',
    '',
    ...passages.flatMap(passage => ['### ' + passage.label + ' — ' + passage.reference, '', passage.context, '']),
    section('Interpretive analysis', dossier.interpretiveAnalysis),
    section('Current researcher position', dossier.currentResearcherPosition),
    '## Evidence reviewed',
    '',
    ...(evidence.length ? evidence.flatMap((item, index) => [
      '### ' + (index + 1) + '. ' + item.reference,
      '',
      '- Kind: ' + item.kind,
      '- Source: ' + item.source,
      '- Relationship: ' + item.relationship,
      '- Quality: ' + item.sourceQuality,
      '- Verification: ' + item.verificationStatus,
      '',
      item.detail,
      item.assessmentRationale ? '\nAssessment rationale: ' + item.assessmentRationale : '',
      item.verificationRationale ? '\nVerification rationale: ' + item.verificationRationale : '',
      item.sourceQualityRationale ? '\nSource-quality rationale: ' + item.sourceQualityRationale : '',
      ''
    ]) : ['No linked evidence records were attached.', '']),
    section('Research conclusion and proposed resolution', dossier.researchConclusion),
    section('Rationale for the conclusion', dossier.resolutionRationale),
    section('Remaining uncertainty', dossier.remainingUncertainty),
    '## Interpretation and resolution history',
    '',
    ...(history.length ? history.flatMap((entry, index) => [
      '### Checkpoint ' + (index + 1) + ' — ' + entry.eventType + ' — ' + entry.recordedAt,
      '',
      '**Assessment:** ' + (entry.previousAssessment || 'Initial position') + ' → ' + entry.assessment,
      '**Status:** ' + (entry.previousStatus || 'Initial position') + ' → ' + entry.status,
      '',
      '**Previous position:** ' + (entry.previousResearcherPosition || 'None recorded'),
      '',
      '**Recorded position:** ' + entry.researcherPosition,
      '',
      '**Reason:** ' + entry.rationale,
      '',
      '**Evidence considered:** ' + (entry.evidenceConsidered || 'Not recorded'),
      '',
      '**Analysis:** ' + (entry.analysisSnapshot || 'Not recorded'),
      '',
      '**Uncertainty:** ' + (entry.uncertaintySnapshot || 'Not recorded'),
      ''
    ]) : ['No formal history checkpoints were recorded.', '']),
    '## Methodological limitations',
    '',
    dossierText(dossier.methodNote, 'This document reports recorded research and does not independently verify its conclusions.'),
    '',
    '---',
    'Generated from the locally saved IBS preview dossier. This document is a researcher-prepared record, not an automated theological verdict.',
    ''
  ];
  return lines.join('\n');
}


export function exportTheologicalDossierArchive(versions, metadata = {}) {
  if (!Array.isArray(versions)) throw new TypeError('A dossier version archive is required.');
  const exportedAt = typeof metadata.exportedAt === 'string' && Number.isFinite(Date.parse(metadata.exportedAt))
    ? new Date(metadata.exportedAt).toISOString()
    : new Date().toISOString();
  const snapshot = versions.map(version => {
    if (!version || typeof version !== 'object' || Array.isArray(version) ||
        typeof version.id !== 'string' || !version.id.trim() ||
        typeof version.tensionKey !== 'string' || !version.tensionKey.trim() ||
        !version.dossier || typeof version.dossier !== 'object' || Array.isArray(version.dossier)) {
      throw new TypeError('Every archived dossier version must include its ID, tension key and dossier snapshot.');
    }
    return dossierSnapshotCopy(version);
  });
  return JSON.stringify({
    format: 'ibs-theological-dossier-archive',
    archiveVersion: 1,
    exportedAt,
    dossierVersionCount: snapshot.length,
    dossierVersions: snapshot
  }, null, 2);
}
