export const STUDY_STAGE_KEYS = Object.freeze(['observe', 'interpret', 'doctrine', 'apply']);
export const CLOUD_ACTIVE_SECTION_KEYS = Object.freeze(['observe', 'interpret', 'apply']);
export const DOCTRINE_ACTIVE_STAGE_MARKER = '_activeStage';

const CLOUD_METADATA_FIELDS = Object.freeze({
  scriptureMarkups: '_scriptureMarkups',
  crossReferences: '_crossReferences',
  relatedPassages: '_relatedPassages',
  verseMaps: '_verseMaps',
  passageOutline: '_passageOutline',
  versionHistory: '_versionHistory',
  evidenceLinks: '_evidenceLinks',
  studyClaims: '_studyClaims',
  stageReviews: '_stageReviews'
});

const CLOUD_METADATA_KEYS = new Set(Object.values(CLOUD_METADATA_FIELDS));
const STAGE_KEY_SET = new Set(STUDY_STAGE_KEYS);
const ACTIVE_SECTION_SET = new Set(CLOUD_ACTIVE_SECTION_KEYS);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value, fallback) {
  try {
    if (value === undefined) return fallback;
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

function normalizeStage(value) {
  const stage = String(value || '').trim().toLowerCase();
  return STAGE_KEY_SET.has(stage) ? stage : 'observe';
}

function normalizeSections(value) {
  const input = isObject(value) ? value : {};
  const sections = {};
  STUDY_STAGE_KEYS.forEach(function (stage) {
    sections[stage] = typeof input[stage] === 'string' ? input[stage] : '';
  });
  return sections;
}

function normalizeTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function cloudMetadataToRecord(sectionPayload) {
  const result = {};
  Object.entries(CLOUD_METADATA_FIELDS).forEach(function (entry) {
    const recordField = entry[0];
    const cloudField = entry[1];
    if (Object.prototype.hasOwnProperty.call(sectionPayload, cloudField)) {
      result[recordField] = cloneJson(sectionPayload[cloudField], null);
    }
  });
  return result;
}

function cloudSectionExtras(sectionPayload) {
  const extras = {};
  Object.entries(sectionPayload).forEach(function (entry) {
    const key = entry[0];
    if (STAGE_KEY_SET.has(key) || CLOUD_METADATA_KEYS.has(key) || key === DOCTRINE_ACTIVE_STAGE_MARKER) return;
    extras[key] = cloneJson(entry[1], null);
  });
  return extras;
}

function isValidStudyIdentity(book, chapter) {
  return typeof book === 'string' && book.trim().length > 0 &&
    Number.isInteger(Number(chapter)) && Number(chapter) > 0;
}

/**
 * Convert the current study_records row shape into the local study-record shape.
 * Unknown JSONB section fields are retained in cloudSectionExtras for a safe round trip.
 */
export function cloudRowToStudyRecord(row) {
  if (!isObject(row) || !isValidStudyIdentity(row.book, row.chapter)) {
    throw new TypeError('A study row must include a book and a positive integer chapter.');
  }
  const cloudSections = isObject(row.sections) ? row.sections : {};
  const activeMarker = cloudSections[DOCTRINE_ACTIVE_STAGE_MARKER];
  const activeSection = STAGE_KEY_SET.has(String(activeMarker || '').toLowerCase())
    ? normalizeStage(activeMarker)
    : ACTIVE_SECTION_SET.has(String(row.active_section || '').toLowerCase())
      ? normalizeStage(row.active_section)
      : 'observe';

  return {
    book: row.book.trim(),
    chapter: Number(row.chapter),
    sections: normalizeSections(cloudSections),
    activeSection: activeSection,
    updatedAt: normalizeTimestamp(row.updated_at) || normalizeTimestamp(row.deleted_at) || null,
    deletedAt: normalizeTimestamp(row.deleted_at),
    ...cloudMetadataToRecord(cloudSections),
    cloudSectionExtras: cloudSectionExtras(cloudSections)
  };
}

/**
 * Normalize the older browser-local record shape without discarding fields unknown to
 * this adapter. This function performs no storage access or migration.
 */
export function normalizeLocalStudyRecord(record, fallbackIdentity) {
  if (!isObject(record)) throw new TypeError('A local study record must be an object.');
  const fallback = isObject(fallbackIdentity) ? fallbackIdentity : {};
  const book = typeof record.book === 'string' ? record.book : fallback.book;
  const chapter = record.chapter === undefined ? fallback.chapter : record.chapter;
  if (!isValidStudyIdentity(book, chapter)) {
    throw new TypeError('A local study record must include a book and a positive integer chapter.');
  }

  const knownLocalFields = new Set([
    'book', 'chapter', 'sections', 'activeSection', 'updatedAt', 'deletedAt',
    'cloudSectionExtras', ...Object.keys(CLOUD_METADATA_FIELDS)
  ]);
  const rootExtras = {};
  Object.entries(record).forEach(function (entry) {
    if (!knownLocalFields.has(entry[0])) rootExtras[entry[0]] = cloneJson(entry[1], null);
  });

  const metadata = {};
  Object.keys(CLOUD_METADATA_FIELDS).forEach(function (field) {
    if (Object.prototype.hasOwnProperty.call(record, field)) metadata[field] = cloneJson(record[field], null);
  });

  return {
    ...rootExtras,
    book: String(book).trim(),
    chapter: Number(chapter),
    sections: normalizeSections(record.sections),
    activeSection: normalizeStage(record.activeSection),
    updatedAt: normalizeTimestamp(record.updatedAt),
    deletedAt: normalizeTimestamp(record.deletedAt),
    ...metadata,
    cloudSectionExtras: isObject(record.cloudSectionExtras)
      ? cloneJson(record.cloudSectionExtras, {}) : {}
  };
}

/**
 * Convert a local/new-app record to the existing Supabase study_records schema.
 *
 * Doctrine cannot be written to active_section under the current CHECK constraint.
 * When Doctrine is active we write the nearest earlier stage, "interpret", into the
 * constrained column and retain the true stage in sections._activeStage. New clients
 * restore the true stage from that marker. This function deliberately does not perform
 * a network write.
 */
export function studyRecordToCloudRow(record, userId) {
  const normalized = normalizeLocalStudyRecord(record);
  const owner = String(userId || '').trim();
  if (!owner) throw new TypeError('A user ID is required to prepare a cloud study row.');

  const payload = cloneJson(normalized.cloudSectionExtras, {});
  STUDY_STAGE_KEYS.forEach(function (stage) {
    payload[stage] = normalized.sections[stage];
  });

  Object.entries(CLOUD_METADATA_FIELDS).forEach(function (entry) {
    const recordField = entry[0];
    const cloudField = entry[1];
    if (Object.prototype.hasOwnProperty.call(normalized, recordField)) {
      payload[cloudField] = cloneJson(normalized[recordField], null);
    }
  });

  const activeSection = normalizeStage(normalized.activeSection);
  if (activeSection === 'doctrine') {
    payload[DOCTRINE_ACTIVE_STAGE_MARKER] = 'doctrine';
  } else {
    delete payload[DOCTRINE_ACTIVE_STAGE_MARKER];
  }

  const row = {
    user_id: owner,
    book: normalized.book,
    chapter: normalized.chapter,
    sections: payload,
    active_section: activeSection === 'doctrine' ? 'interpret' : activeSection,
    updated_at: normalized.updatedAt || new Date().toISOString(),
    deleted_at: normalized.deletedAt || null
  };

  // Do not allow extra root properties to replace fields controlled by this adapter.
  row.user_id = owner;
  row.book = normalized.book;
  row.chapter = normalized.chapter;
  row.sections = payload;
  row.active_section = activeSection === 'doctrine' ? 'interpret' : activeSection;
  row.updated_at = normalized.updatedAt || row.updated_at;
  row.deleted_at = normalized.deletedAt || null;
  return row;
}

export function studyRecordKey(book, chapter) {
  if (!isValidStudyIdentity(book, chapter)) throw new TypeError('A valid book and chapter are required.');
  return String(book).trim() + '::' + Number(chapter);
}
