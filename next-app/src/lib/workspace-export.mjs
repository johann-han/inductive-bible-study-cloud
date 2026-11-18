const WORKSPACE_ARCHIVE_FORMAT = 'ibs-workspace-archive';
const WORKSPACE_ARCHIVE_VERSION = 1;
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;

export const WORKSPACE_EXPORT_STORES = Object.freeze({
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
  dossierVersions: 'ibs-next-generation-preview-theological-dossier-versions-v1'
});

const ARRAY_STORES = new Set(['crossReferences', 'evidence', 'dossierVersions', 'deletedStudies']);
const PASSAGE_MAP_STORES = new Set(['scriptureMarkup', 'wordMarkup']);
const OBJECT_STORES = new Set([
  'drafts', 'markupColors', 'claimSynthesis', 'doctrineReviews', 'theologicalTensions'
]);

function emptyStore(name) {
  return ARRAY_STORES.has(name) ? [] : {};
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readStore(storage, name, key) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    throw new Error('Could not read the "' + name + '" workspace store: ' +
      (error instanceof Error ? error.message : String(error)));
  }
  if (raw === null) return emptyStore(name);
  try {
    return JSON.parse(raw);
  } catch {
    throw new TypeError('The "' + name + '" workspace store contains invalid JSON. No data was changed.');
  }
}

function countStore(name, value) {
  if (ARRAY_STORES.has(name)) {
    if (!Array.isArray(value)) throw new TypeError('The "' + name + '" store is not an array. Export stopped to avoid an incomplete backup.');
    return value.length;
  }

  if (PASSAGE_MAP_STORES.has(name)) {
    if (!isRecord(value)) throw new TypeError('The "' + name + '" store is not a passage map. Export stopped to avoid an incomplete backup.');
    return Object.values(value).reduce((total, verses) => {
      if (!isRecord(verses)) throw new TypeError('The "' + name + '" store contains an invalid passage entry. Export stopped.');
      return total + Object.keys(verses).length;
    }, 0);
  }

  if (name === 'theologicalTensions') {
    if (!isRecord(value)) throw new TypeError('The theologicalTensions store is not a record map. Export stopped.');
    return Object.values(value).reduce((total, records) => {
      if (!Array.isArray(records)) throw new TypeError('The theologicalTensions store contains an invalid record group. Export stopped.');
      return total + records.length;
    }, 0);
  }

  if (OBJECT_STORES.has(name)) {
    if (!isRecord(value)) throw new TypeError('The "' + name + '" store is not an object. Export stopped to avoid an incomplete backup.');
    return Object.keys(value).length;
  }

  throw new TypeError('Unsupported workspace store "' + name + '".');
}

/**
 * Build a PR #187-compatible archive from the browser's existing localStorage.
 * Values are parsed and copied as-is; this function never writes to storage or
 * filters individual records. The PR #188 importer performs schema validation.
 */
export function buildPreviewWorkspaceArchive(storage, metadata = {}) {
  if (!storage || typeof storage.getItem !== 'function') {
    throw new TypeError('Browser workspace storage is unavailable.');
  }

  const stores = {};
  const counts = {};

  for (const [name, key] of Object.entries(WORKSPACE_EXPORT_STORES)) {
    const value = readStore(storage, name, key);
    counts[name] = countStore(name, value);
    stores[name] = value;
  }

  const exportedAt = metadata.exportedAt || new Date().toISOString();
  if (typeof exportedAt !== 'string' || !Number.isFinite(Date.parse(exportedAt))) {
    throw new TypeError('The archive export timestamp is invalid.');
  }

  const archive = {
    format: WORKSPACE_ARCHIVE_FORMAT,
    archiveVersion: WORKSPACE_ARCHIVE_VERSION,
    exportedAt: new Date(exportedAt).toISOString(),
    application: 'IBS Next-generation preview',
    stores,
    counts
  };

  const size = new TextEncoder().encode(JSON.stringify(archive)).byteLength;
  if (size > MAX_ARCHIVE_BYTES) {
    throw new RangeError('The workspace archive exceeds the 25 MB import limit. No data was changed.');
  }

  return archive;
}
