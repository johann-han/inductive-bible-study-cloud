import { isWordStudyRecord } from './word-studies.mjs';

const WORKSPACE_ARCHIVE_FORMAT = 'ibs-workspace-archive';
const WORKSPACE_ARCHIVE_VERSION = 2;
const SUPPORTED_WORKSPACE_ARCHIVE_VERSIONS = new Set([1, WORKSPACE_ARCHIVE_VERSION]);
const UNSAFE_RECORD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const DOSSIER_ARCHIVE_FORMAT = 'ibs-theological-dossier-archive';
const DOSSIER_ARCHIVE_VERSION = 1;
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;

export const WORKSPACE_ARCHIVE_STORES = Object.freeze({
  drafts: 'ibs-next-generation-preview-drafts-v1',
  deletedStudies: 'ibs-next-generation-preview-deleted-studies-v1',
  scriptureMarkup: 'ibs-next-generation-preview-scripture-markup-v1',
  wordMarkup: 'ibs-next-generation-preview-word-markup-v1',
  markupColors: 'ibs-preview-markup-colors-v1',
  crossReferences: 'ibs-next-generation-preview-cross-references-v1',
  evidence: 'ibs-next-generation-preview-evidence-v1',
  claimSynthesis: 'ibs-next-generation-preview-claim-synthesis-v1',
  doctrineReviews: 'ibs-next-generation-preview-doctrine-reviews-v1',
  theologicalTensions: 'ibs-next-generation-preview-theological-tensions-v1',
  dossierVersions: 'ibs-next-generation-preview-theological-dossier-versions-v1',
  wordStudies: 'ibs-next-generation-preview-word-studies-v1'
});

const STORE_VALIDATORS = {
  deletedStudies: value => Array.isArray(value) && value.length <= 10000 &&
    value.every(item => isObject(item) && nonEmpty(item.id) && validBiblePassage(item.book, item.chapter) &&
      typeof item.deletedAt === 'string' && Number.isFinite(Date.parse(item.deletedAt)) &&
      hasSafeKeys(item.record) &&
      ['observe', 'interpret', 'doctrine', 'apply'].every(stage =>
        typeof item.record[stage] === 'string' && item.record[stage].length <= 200000) &&
      ['observe', 'interpret', 'doctrine', 'apply'].includes(item.record.activeStage) &&
      isNoteVersionHistory(item.record.versionHistory)) &&
    hasUniqueIds(value) && new Set(value.map(item => item.book + '|' + item.chapter)).size === value.length,
  drafts: value => isObject(value) && Object.entries(value).every(([key, record]) => {
    const match = key.match(/^(.+)\|(\d+)$/);
    return Boolean(match && validBiblePassage(match[1], Number(match[2]))) &&
      isObject(record) &&
      ['observe', 'interpret', 'doctrine', 'apply'].every(stage =>
        record[stage] === undefined || typeof record[stage] === 'string') &&
      (record.activeStage === undefined || ['observe', 'interpret', 'doctrine', 'apply'].includes(record.activeStage)) &&
      isNoteVersionHistory(record.versionHistory);
  }),
  scriptureMarkup: value => isPassageMap(value, tags => Array.isArray(tags) &&
    tags.every(tag => VALID_TAGS.has(tag))),
  wordMarkup: value => isPassageMap(value, ranges => Array.isArray(ranges) && ranges.every(range =>
    isObject(range) && Number.isInteger(range.start) && range.start >= 0 &&
    Number.isInteger(range.end) && range.end > range.start && Array.isArray(range.tags) &&
    range.tags.length > 0 && range.tags.every(tag => VALID_TAGS.has(tag)))),
  markupColors: value => isObject(value) && Object.entries(value).every(([key, colour]) =>
    VALID_TAGS.has(key) && typeof colour === 'string' && /^#[0-9a-f]{6}$/i.test(colour)),
  crossReferences: value => Array.isArray(value) && value.length <= 500 && value.every(isCrossReference) && hasUniqueIds(value),
  evidence: value => Array.isArray(value) && value.length <= 20000 && value.every(item =>
    isObject(item) && nonEmpty(item.id) && nonEmpty(item.passageKey) &&
    ['observe', 'interpret', 'doctrine', 'apply'].includes(item.stage) &&
    typeof item.claim === 'string' && typeof item.reference === 'string' &&
    typeof item.detail === 'string' && typeof item.source === 'string') && hasUniqueIds(value),
  claimSynthesis: value => hasSafeKeys(value) && Object.values(value).every(item =>
    isObject(item) && ['under_review', 'provisional', 'ready_for_doctrine', 'revisit'].includes(item.status) &&
    typeof item.conclusion === 'string' && typeof item.reasoning === 'string' &&
    validOptionalDate(item.updatedAt)),
  doctrineReviews: value => hasSafeKeys(value) && Object.values(value).every(item =>
    isObject(item) && ['', 'explicit', 'necessary_implication', 'broader_inference'].includes(item.claimLevel) &&
    ['supportingPassages', 'tensions', 'formulation', 'unresolved'].every(field => typeof item[field] === 'string') &&
    typeof item.approved === 'boolean' && validOptionalDate(item.updatedAt)),
  theologicalTensions: value => hasSafeKeys(value) && Object.values(value).every(records =>
    Array.isArray(records) && records.length <= 10000 && records.every(isTension)) &&
    hasUniqueIds(Object.values(value).flat()),
  dossierVersions: value => Array.isArray(value) && value.length <= 20000 && value.every(isDossierVersion) && hasUniqueIds(value),
  wordStudies: value => Array.isArray(value) && value.length <= 5000 && value.every(isWordStudyRecord) && hasUniqueIds(value)
};

const VALID_TAGS = new Set(['key-word', 'repeated-idea', 'contrast', 'command', 'promise', 'question']);
const ASSESSMENTS = new Set(['unclassified', 'apparent_tension', 'complementary', 'unresolved', 'perceived_contradiction']);
const STATUSES = new Set(['open', 'under_review', 'provisionally_addressed', 'researcher_resolved']);
const HISTORY_EVENT_TYPES = new Set(['initial_position', 'interpretive_revision', 'assessment_change', 'resolution_proposed', 'resolution_revised', 'reopened', 'other']);

function isNoteVersionHistory(value) {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 8) return false;
  const ids = new Set();
  return value.every(entry => {
    if (!isObject(entry) || !nonEmpty(entry.id) || entry.id.length > 100 || ids.has(entry.id) ||
        typeof entry.savedAt !== 'string' || !Number.isFinite(Date.parse(entry.savedAt)) ||
        !['observe', 'interpret', 'doctrine', 'apply'].includes(entry.activeStage) ||
        !isObject(entry.sections)) return false;
    const validSections = ['observe', 'interpret', 'doctrine', 'apply'].every(stage =>
      typeof entry.sections[stage] === 'string' && entry.sections[stage].length <= 200000);
    if (!validSections) return false;
    ids.add(entry.id);
    return true;
  });
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
function hasSafeKeys(value) { return isObject(value) && Object.keys(value).every(key => !UNSAFE_RECORD_KEYS.has(key)); }
function hasUniqueIds(items) {
  const ids = new Set();
  for (const item of items) {
    if (!isObject(item) || !nonEmpty(item.id) || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}
function validOptionalDate(value) { return value === undefined || value === null || value === '' || (typeof value === 'string' && Number.isFinite(Date.parse(value))); }
function isPassageMap(value, validate) {
  return isObject(value) && Object.entries(value).every(([key, verses]) => {
    const match = key.match(/^(.+)\|(\d+)$/);
    return Boolean(match && validBiblePassage(match[1], Number(match[2]))) &&
      isObject(verses) && Object.entries(verses).every(([verse, data]) =>
        /^\d+$/.test(verse) && Number(verse) > 0 && Number(verse) <= 300 && validate(data));
  });
}
function validBiblePassage(book, chapter) {
  const limits = {
    Genesis:50, Exodus:40, Leviticus:27, Numbers:36, Deuteronomy:34, Joshua:24, Judges:21, Ruth:4,
    '1 Samuel':31, '2 Samuel':24, '1 Kings':22, '2 Kings':25, '1 Chronicles':29, '2 Chronicles':36,
    Ezra:10, Nehemiah:13, Esther:10, Job:42, Psalms:150, Proverbs:31, Ecclesiastes:12, 'Song of Solomon':8,
    Isaiah:66, Jeremiah:52, Lamentations:5, Ezekiel:48, Daniel:12, Hosea:14, Joel:3, Amos:9, Obadiah:1,
    Jonah:4, Micah:7, Nahum:3, Habakkuk:3, Zephaniah:3, Haggai:2, Zechariah:14, Malachi:4,
    Matthew:28, Mark:16, Luke:24, John:21, Acts:28, Romans:16, '1 Corinthians':16, '2 Corinthians':13,
    Galatians:6, Ephesians:6, Philippians:4, Colossians:4, '1 Thessalonians':5, '2 Thessalonians':3,
    '1 Timothy':6, '2 Timothy':4, Titus:3, Philemon:1, Hebrews:13, James:5, '1 Peter':5, '2 Peter':3,
    '1 John':5, '2 John':1, '3 John':1, Jude:1, Revelation:22
  };
  return typeof book === 'string' && Object.prototype.hasOwnProperty.call(limits, book) &&
    Number.isInteger(chapter) && chapter >= 1 && chapter <= limits[book];
}
function isCrossReference(item) {
  return isObject(item) && nonEmpty(item.id) &&
    validBiblePassage(item.sourceBook, Number(item.sourceChapter)) &&
    validBiblePassage(item.targetBook, Number(item.targetChapter)) &&
    (item.sourceVerse === null || (Number.isInteger(item.sourceVerse) && item.sourceVerse > 0 && item.sourceVerse <= 300)) &&
    (item.targetVerse === null || (Number.isInteger(item.targetVerse) && item.targetVerse > 0 && item.targetVerse <= 300)) &&
    typeof item.note === 'string' && typeof item.createdAt === 'string';
}
function isHistoryEntry(entry) {
  return isObject(entry) && nonEmpty(entry.id) && validOptionalDate(entry.recordedAt) &&
    HISTORY_EVENT_TYPES.has(entry.eventType) && nonEmpty(entry.researcherPosition) &&
    nonEmpty(entry.rationale) && ASSESSMENTS.has(entry.assessment) && STATUSES.has(entry.status);
}
function isTension(item) {
  return isObject(item) && nonEmpty(item.id) &&
    ['passageA', 'contextA', 'passageB', 'contextB', 'issue', 'analysis', 'uncertainty'].every(key => typeof item[key] === 'string') &&
    ASSESSMENTS.has(item.assessment) && STATUSES.has(item.status) && validOptionalDate(item.updatedAt) &&
    (item.history === undefined || (Array.isArray(item.history) && item.history.every(isHistoryEntry)));
}
function isDossierVersion(item) {
  return isObject(item) && nonEmpty(item.id) && nonEmpty(item.tensionKey) &&
    nonEmpty(item.tensionId) && Number.isInteger(item.versionNumber) && item.versionNumber > 0 &&
    validOptionalDate(item.savedAt) && isObject(item.dossier) &&
    typeof item.dossier.title === 'string' && validOptionalDate(item.dossier.generatedAt) &&
    Array.isArray(item.dossier.passages) && Array.isArray(item.dossier.evidence) &&
    Array.isArray(item.dossier.history);
}
function parseJson(raw) {
  if (typeof raw !== 'string') throw new TypeError('Select a JSON archive file.');
  if (new TextEncoder().encode(raw).byteLength > MAX_ARCHIVE_BYTES) throw new RangeError('The archive exceeds the 25 MB import limit.');
  try { return JSON.parse(raw); } catch (_) { throw new TypeError('The selected file is not valid JSON.'); }
}
function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (isObject(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function fingerprint(value) { return stableStringify(value); }
function duplicateKey(store, item) {
  if (['evidence', 'crossReferences', 'wordStudies', 'deletedStudies'].includes(store)) return String(item.id || '');
  if (store === 'dossierVersions') return String(item.id || '');
  if (['drafts', 'scriptureMarkup', 'wordMarkup', 'markupColors', 'claimSynthesis', 'doctrineReviews'].includes(store)) return String(item.key || '');
  if (store === 'theologicalTensions') return String(item.id || '');
  return '';
}
function collectionFor(store, data) {
  if (store === 'theologicalTensions') return Object.entries(data).flatMap(([key, records]) => records.map(record => ({ key, record })));
  if (store === 'drafts') return Object.entries(data).map(([key, value]) => ({ key, value }));
  if (store === 'scriptureMarkup' || store === 'wordMarkup') return Object.entries(data).flatMap(([key, verses]) => Object.entries(verses).map(([verse, value]) => ({ key: key + ':' + verse, value })));
  if (store === 'evidence' || store === 'crossReferences' || store === 'dossierVersions' || store === 'wordStudies' || store === 'deletedStudies') return data;
  if (isObject(data)) return Object.entries(data).map(([key, value]) => ({ key, value }));
  return [];
}
function inspectStore(store, incoming, existing) {
  const valid = STORE_VALIDATORS[store](incoming);
  if (!valid) throw new TypeError('Archive store "' + store + '" failed schema validation.');
  const incomingItems = collectionFor(store, incoming);
  const existingItems = collectionFor(store, existing);
  const existingById = new Map();
  for (const entry of existingItems) {
    const item = store === 'theologicalTensions' ? entry.record : entry;
    const id = duplicateKey(store, item);
    if (id) existingById.set(id, entry);
  }
  let identical = 0;
  let conflicting = 0;
  let newItems = 0;
  const conflicts = [];
  for (const entry of incomingItems) {
    const item = entry.record || entry;
    const id = store === 'theologicalTensions' ? item.id : duplicateKey(store, item);
    const prior = id ? existingById.get(store === 'theologicalTensions' ? id : id) : null;
    if (!prior) { newItems++; continue; }
    const priorItem = store === 'theologicalTensions' ? prior.record : prior;
    const identicalRecord = fingerprint(priorItem) === fingerprint(item);
    const identicalLocation = store !== 'theologicalTensions' || prior.key === entry.key;
    if (identicalRecord && identicalLocation) identical++;
    else {
      conflicting++;
      const description = store === 'wordStudies'
        ? item.strongsId + ' · ' + item.reference.book + ' ' + item.reference.chapter + ':' + item.reference.verse
        : item.reference || item.title || item.issue || item.id;
      conflicts.push({ id, store, description });
    }
  }
  return { incomingCount: incomingItems.length, identical, conflicting, newItems, conflicts };
}

export function validateWorkspaceArchive(input) {
  const archive = typeof input === 'string' ? parseJson(input) : input;
  if (!isObject(archive)) throw new TypeError('The archive root must be a JSON object.');
  if (archive.format === DOSSIER_ARCHIVE_FORMAT) {
    if (archive.archiveVersion !== DOSSIER_ARCHIVE_VERSION || !Array.isArray(archive.dossierVersions) ||
        archive.dossierVersionCount !== archive.dossierVersions.length ||
        !archive.dossierVersions.every(isDossierVersion)) {
      throw new TypeError('The theological dossier archive is incomplete or has an unsupported version.');
    }
    return {
      kind: 'dossier',
      archiveVersion: archive.archiveVersion,
      exportedAt: archive.exportedAt || null,
      stores: { dossierVersions: archive.dossierVersions },
      counts: { dossierVersions: archive.dossierVersions.length }
    };
  }
  if (archive.format !== WORKSPACE_ARCHIVE_FORMAT || !SUPPORTED_WORKSPACE_ARCHIVE_VERSIONS.has(archive.archiveVersion) ||
      !isObject(archive.stores) || !isObject(archive.counts)) {
    throw new TypeError('Unsupported IBS archive format or version.');
  }
  for (const store of Object.keys(archive.stores)) {
    if (!Object.prototype.hasOwnProperty.call(STORE_VALIDATORS, store)) {
      throw new TypeError('Archive contains an unsupported store "' + store + '". Refusing partial restoration.');
    }
  }
  const includedStores = Object.keys(archive.stores);
  const countStores = Object.keys(archive.counts);
  if (includedStores.length !== countStores.length || countStores.some(store => !Object.prototype.hasOwnProperty.call(archive.stores, store))) {
    throw new TypeError('Archive counts do not match the included data stores.');
  }
  const stores = {};
  const counts = {};
  for (const [store, validator] of Object.entries(STORE_VALIDATORS)) {
    if (!Object.prototype.hasOwnProperty.call(archive.stores, store)) continue;
    const data = archive.stores[store];
    if (!validator(data)) throw new TypeError('Archive store "' + store + '" failed validation.');
    stores[store] = data;
    counts[store] = collectionFor(store, data).length;
    if (archive.counts[store] !== counts[store]) throw new TypeError('Archive count does not match store "' + store + '".');
  }
  if (!Object.keys(stores).length) throw new TypeError('The archive contains no supported research data.');
  return { kind: 'workspace', archiveVersion: archive.archiveVersion, exportedAt: archive.exportedAt || null, stores, counts };
}

export function buildWorkspaceArchive(stores, metadata = {}) {
  if (!isObject(stores)) throw new TypeError('Workspace archive stores must be an object.');
  const normalized = {};
  const counts = {};
  for (const [name, data] of Object.entries(stores)) {
    const validator = STORE_VALIDATORS[name];
    if (!validator || !validator(data)) throw new TypeError('Workspace archive store "' + name + '" is unsupported or invalid.');
    normalized[name] = data;
    counts[name] = collectionFor(name, data).length;
  }
  if (!Object.keys(normalized).length) throw new TypeError('There is no supported research data to export.');
  return {
    format: WORKSPACE_ARCHIVE_FORMAT,
    archiveVersion: WORKSPACE_ARCHIVE_VERSION,
    exportedAt: validOptionalDate(metadata.exportedAt) && metadata.exportedAt ? new Date(metadata.exportedAt).toISOString() : new Date().toISOString(),
    application: 'IBS Next-generation preview',
    stores: normalized,
    counts
  };
}

export function planWorkspaceArchiveImport(validated, currentStores) {
  if (!validated || !isObject(validated.stores) || !isObject(currentStores)) throw new TypeError('A validated archive and current store snapshot are required.');
  const report = {};
  for (const [store, incoming] of Object.entries(validated.stores)) {
    report[store] = inspectStore(store, incoming, currentStores[store] ?? (Array.isArray(incoming) ? [] : {}));
  }
  return report;
}

function mergeCollection(store, existing, incoming, decisions) {
  const output = Array.isArray(existing) ? [...existing] : [];
  const byId = new Map(output.map((item, index) => [duplicateKey(store, item), index]).filter(([id]) => id));
  for (const item of incoming) {
    const id = duplicateKey(store, item);
    const existingIndex = id ? byId.get(id) : undefined;
    if (existingIndex === undefined) { output.push(item); continue; }
    const decision = decisions[store + ':' + id] || 'keep';
    if (decision === 'replace') output[existingIndex] = item;
    else if (decision === 'keep') continue;
    else if (decision === 'duplicate') output.push({ ...item, id: createImportId() });
  }
  return output;
}
function createImportId() {
  return 'import-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
function mergeKeyed(store, existing, incoming, decisions) {
  const output = Object.assign(Object.create(null), existing || {});
  for (const [key, value] of Object.entries(incoming)) {
    if (!Object.prototype.hasOwnProperty.call(output, key)) { output[key] = value; continue; }
    if (fingerprint(output[key]) === fingerprint(value)) continue;
    const decision = decisions[store + ':' + key] || 'keep';
    if (decision === 'replace') output[key] = value;
    else if (decision === 'duplicate') {
      const alternate = key + '::import-' + createImportId();
      output[alternate] = value;
    }
  }
  return output;
}
function duplicatePassageValue(store, existing, incoming) {
  if (store === 'scriptureMarkup') return Array.from(new Set([...existing, ...incoming]));
  if (store === 'wordMarkup') {
    const ranges = new Map();
    for (const range of [...existing, ...incoming]) {
      const key = range.start + ':' + range.end;
      const prior = ranges.get(key);
      ranges.set(key, prior
        ? { ...prior, tags: Array.from(new Set([...prior.tags, ...range.tags])) }
        : { ...range, tags: [...range.tags] });
    }
    return Array.from(ranges.values()).sort((a, b) => a.start - b.start || a.end - b.end);
  }
  return existing;
}
function mergeDraftStore(existing, incoming, decisions) {
  const output = Object.assign(Object.create(null), existing || {});
  for (const [passageKey, value] of Object.entries(incoming)) {
    if (!Object.prototype.hasOwnProperty.call(output, passageKey)) {
      output[passageKey] = value;
      continue;
    }
    if (fingerprint(output[passageKey]) === fingerprint(value)) continue;
    const decision = decisions['drafts:' + passageKey] || 'keep';
    if (decision === 'replace') output[passageKey] = value;
  }
  return output;
}
function mergePassageStore(store, existing, incoming, decisions) {
  const output = Object.assign(Object.create(null), existing || {});
  for (const [passageKey, incomingVerses] of Object.entries(incoming)) {
    const currentVerses = { ...(output[passageKey] || {}) };
    for (const [verse, value] of Object.entries(incomingVerses)) {
      if (!Object.prototype.hasOwnProperty.call(currentVerses, verse)) { currentVerses[verse] = value; continue; }
      if (fingerprint(currentVerses[verse]) === fingerprint(value)) continue;
      const conflictId = passageKey + ':' + verse;
      const decision = decisions[store + ':' + conflictId] || 'keep';
      if (decision === 'replace') currentVerses[verse] = value;
      else if (decision === 'duplicate' && ['scriptureMarkup', 'wordMarkup'].includes(store)) {
        currentVerses[verse] = duplicatePassageValue(store, currentVerses[verse], value);
      }
    }
    output[passageKey] = currentVerses;
  }
  return output;
}
function findTensionLocation(map, id) {
  for (const [key, records] of Object.entries(map || {})) {
    const index = records.findIndex(record => record.id === id);
    if (index >= 0) return { key, index, record: records[index] };
  }
  return null;
}
function removeTensionAt(map, location) {
  if (!location) return;
  const records = [...(map[location.key] || [])];
  records.splice(location.index, 1);
  if (records.length) map[location.key] = records;
  else delete map[location.key];
}
function appendTension(map, key, record) {
  map[key] = [...(map[key] || []), record];
}
function mergeTensions(existing, incoming, decisions) {
  const output = Object.assign(Object.create(null), Object.fromEntries(Object.entries(existing || {}).map(([key, records]) => [key, [...records]])));
  for (const [key, items] of Object.entries(incoming)) {
    for (const item of items) {
      const location = findTensionLocation(output, item.id);
      if (!location) {
        appendTension(output, key, item);
        continue;
      }
      if (location.key === key && fingerprint(location.record) === fingerprint(item)) continue;
      const decision = decisions['theologicalTensions:' + item.id] || 'keep';
      if (decision === 'replace') {
        removeTensionAt(output, location);
        appendTension(output, key, item);
      } else if (decision === 'duplicate') {
        appendTension(output, key, { ...item, id: createImportId() });
      }
    }
  }
  return output;
}
function replaceTensions(existing, incoming, decisions) {
  const includedKeys = new Set(Object.keys(incoming));
  const output = Object.assign(Object.create(null), Object.fromEntries(Object.entries(existing || {})
    .filter(([key]) => !includedKeys.has(key))
    .map(([key, records]) => [key, [...records]])));
  for (const [key, records] of Object.entries(incoming)) {
    for (const record of records) {
      const location = findTensionLocation(existing || {}, record.id);
      if (!location) {
        appendTension(output, key, record);
        continue;
      }
      if (location.key === key && fingerprint(location.record) === fingerprint(record)) {
        appendTension(output, key, location.record);
        continue;
      }
      const choice = decisions['theologicalTensions:' + record.id];
      if (choice === 'keep') {
        appendTension(output, location.key, location.record);
      } else if (choice === 'duplicate') {
        appendTension(output, location.key, location.record);
        appendTension(output, key, { ...record, id: createImportId() });
      } else {
        removeTensionAt(output, location);
        appendTension(output, key, record);
      }
    }
  }
  return output;
}

function replaceStoreWithDecisions(store, existing, incoming, decisions) {
  if (store === 'theologicalTensions') return replaceTensions(existing || {}, incoming, decisions);
  if (['evidence', 'crossReferences', 'dossierVersions', 'wordStudies', 'deletedStudies'].includes(store)) {
    const output = [...incoming];
    const incomingIds = new Set(incoming.map(item => item.id));
    for (const prior of existing || []) {
      if (!incomingIds.has(prior.id)) continue;
      const index = output.findIndex(item => item.id === prior.id);
      if (fingerprint(prior) === fingerprint(output[index])) continue;
      const choice = decisions[store + ':' + prior.id];
      if (choice === 'keep') output[index] = prior;
      else if (choice === 'duplicate') { output[index] = prior; output.push({ ...incoming[index], id: createImportId() }); }
    }
    return output;
  }
  if (store === 'drafts') {
    const output = Object.assign(Object.create(null), incoming);
    for (const [passageKey, value] of Object.entries(incoming)) {
      const prior = existing?.[passageKey];
      if (prior === undefined || fingerprint(prior) === fingerprint(value)) continue;
      if (decisions['drafts:' + passageKey] === 'keep') output[passageKey] = prior;
    }
    return output;
  }
  if (['scriptureMarkup', 'wordMarkup'].includes(store)) {
    const output = Object.assign(Object.create(null), incoming);
    for (const [passageKey, verses] of Object.entries(incoming)) {
      output[passageKey] = { ...verses };
      for (const [verse, value] of Object.entries(verses)) {
        const prior = existing?.[passageKey]?.[verse];
        if (prior === undefined || fingerprint(prior) === fingerprint(value)) continue;
        const choice = decisions[store + ':' + passageKey + ':' + verse];
        if (choice === 'keep') output[passageKey][verse] = prior;
        else if (choice === 'duplicate' && ['scriptureMarkup', 'wordMarkup'].includes(store)) output[passageKey][verse] = duplicatePassageValue(store, prior, value);
      }
    }
    return output;
  }
  const output = Object.assign(Object.create(null), incoming);
  for (const [key, value] of Object.entries(incoming)) {
    if (!Object.prototype.hasOwnProperty.call(existing || {}, key) || fingerprint(existing[key]) === fingerprint(value)) continue;
    const choice = decisions[store + ':' + key];
    if (choice === 'keep') output[key] = existing[key];
    else if (choice === 'duplicate') { output[key] = existing[key]; output[key + '::import-' + createImportId()] = value; }
  }
  return output;
}

const DUPLICATE_SUPPORTED_STORES = new Set(['scriptureMarkup', 'wordMarkup', 'crossReferences', 'evidence', 'theologicalTensions', 'dossierVersions', 'wordStudies', 'deletedStudies']);
function validateImportDecisions(report, decisions) {
  for (const [store, item] of Object.entries(report)) {
    for (const conflict of item.conflicts) {
      const decision = decisions[store + ':' + conflict.id];
      if (decision !== undefined && !['keep', 'replace', 'duplicate'].includes(decision)) {
        throw new TypeError('Invalid conflict decision for ' + store + '.');
      }
      if (decision === 'duplicate' && !DUPLICATE_SUPPORTED_STORES.has(store)) {
        throw new TypeError('A separate copy is not supported for ' + store + ' records. Choose keep or replace.');
      }
    }
  }
}
export function applyWorkspaceArchiveImport(validated, currentStores, decisions = {}, mode = 'merge') {
  const report = planWorkspaceArchiveImport(validated, currentStores);
  validateImportDecisions(report, decisions);
  const conflictCount = Object.values(report).reduce((sum, item) => sum + item.conflicting, 0);
  if (mode !== 'merge' && mode !== 'replace') throw new TypeError('Choose merge or replace import mode.');
  if (mode === 'replace' && conflictCount && Object.entries(report).some(([store, item]) =>
    item.conflicts.some(conflict => !decisions[store + ':' + conflict.id]))) {
    throw new TypeError('Resolve every duplicate conflict before replacing records.');
  }
  const next = { ...currentStores };
  for (const [store, incoming] of Object.entries(validated.stores)) {
    if (mode === 'replace') {
      next[store] = replaceStoreWithDecisions(store, currentStores[store], incoming, decisions);
      continue;
    }
    if (store === 'theologicalTensions') next[store] = mergeTensions(currentStores[store] || {}, incoming, decisions);
    else if (store === 'drafts') next[store] = mergeDraftStore(currentStores[store] || {}, incoming, decisions);
    else if (['evidence', 'crossReferences', 'dossierVersions', 'wordStudies', 'deletedStudies'].includes(store)) next[store] = mergeCollection(store, currentStores[store] || [], incoming, decisions);
    else if (['scriptureMarkup', 'wordMarkup'].includes(store)) next[store] = mergePassageStore(store, currentStores[store] || {}, incoming, decisions);
    else next[store] = mergeKeyed(store, currentStores[store] || {}, incoming, decisions);
  }
  return next;
}
