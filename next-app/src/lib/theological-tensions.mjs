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
  return {
    title: 'Research Conclusion and Resolution Dossier',
    generatedAt,
    studyPassage: dossierText(record.studyPassage, dossierText(record.studyKey, 'Study passage not identified')),
    doctrinalClaim: dossierText(record.claimDisplay, dossierText(record.claimKey, 'Claim not recorded')),
    claimLevel: dossierText(review.claimLevel, 'Not classified'),
    originalSynthesis: dossierText(synthesis.conclusion, 'No claim synthesis recorded'),
    synthesisReasoning: dossierText(synthesis.reasoning, 'No synthesis reasoning recorded'),
    refinedDoctrinalFormulation: dossierText(review.formulation, 'No refined doctrinal formulation recorded'),
    doctrineReviewQuestions: dossierText(review.unresolved, 'No Doctrine review questions recorded'),
    assessment: dossierText(record.assessment, 'unclassified'),
    status: dossierText(record.status, 'open'),
    passages: [
      { label: 'Passage A', reference: dossierText(record.passageA, 'Reference not recorded'), context: dossierText(record.contextA, 'Context and meaning not recorded') },
      { label: 'Passage B', reference: dossierText(record.passageB, 'Reference not recorded'), context: dossierText(record.contextB, 'Context and meaning not recorded') }
    ],
    issue: dossierText(record.issue, 'No precise point of tension recorded'),
    interpretiveAnalysis: dossierText(record.analysis, 'No interpretive analysis recorded'),
    researchConclusion: dossierText(record.resolution, 'No formal research conclusion or proposed resolution has been recorded.'),
    resolutionRationale: dossierText(record.resolutionRationale, 'No rationale for the proposed resolution has been recorded.'),
    evidence,
    history,
    remainingUncertainty: dossierText(record.uncertainty, 'No remaining uncertainty has been recorded.'),
    methodNote: 'This dossier reports the researcher’s recorded work. It does not independently verify the interpretation, decide whether passages contradict one another, or resolve questions left open by the evidence.'
  };
}
