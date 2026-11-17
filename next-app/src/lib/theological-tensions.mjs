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
