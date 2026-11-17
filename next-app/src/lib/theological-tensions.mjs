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

  const previous = Array.isArray(record.history) ? record.history[record.history.length - 1] : null;
  const entry = Object.freeze({
    id,
    recordedAt,
    eventType,
    previousAssessment: previous?.assessment ?? null,
    assessment: cloneHistoryValue(record.assessment),
    previousStatus: previous?.status ?? null,
    status: cloneHistoryValue(record.status),
    passageA: cloneHistoryValue(record.passageA),
    contextA: cloneHistoryValue(record.contextA),
    passageB: cloneHistoryValue(record.passageB),
    contextB: cloneHistoryValue(record.contextB),
    issue: cloneHistoryValue(record.issue),
    researcherPosition,
    analysisSnapshot: cloneHistoryValue(record.analysis),
    evidenceConsidered: typeof input.evidenceConsidered === 'string' ? input.evidenceConsidered.trim() : '',
    uncertaintySnapshot: cloneHistoryValue(record.uncertainty),
    rationale
  });
  const history = [...(Array.isArray(record.history) ? record.history : []), entry];
  return { ...record, history, updatedAt: recordedAt };
}
