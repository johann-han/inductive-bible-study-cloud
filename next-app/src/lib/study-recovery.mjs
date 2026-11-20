import { getBibleBook } from './bible.mjs';

export const DELETED_STUDIES_STORAGE_KEY = 'ibs-next-generation-preview-deleted-studies-v1';
export const PREVIEW_DRAFTS_STORAGE_KEY = 'ibs-next-generation-preview-drafts-v1';

const STAGES = Object.freeze(['observe', 'interpret', 'doctrine', 'apply']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    throw new TypeError('Browser storage is unavailable.');
  }
}

function normalizeIdentity(book, chapter) {
  const normalizedBook = String(book || '').trim();
  const normalizedChapter = Number(chapter);
  const bookInfo = getBibleBook(normalizedBook);
  if (!bookInfo || !Number.isInteger(normalizedChapter) ||
      normalizedChapter < 1 || normalizedChapter > bookInfo.chapters) {
    throw new TypeError('A valid Bible book and chapter are required.');
  }
  return { book: normalizedBook, chapter: normalizedChapter, key: normalizedBook + '|' + normalizedChapter };
}

function safeParse(raw, fallback, label) {
  if (raw === null) return clone(fallback);
  try {
    return JSON.parse(raw);
  } catch {
    throw new TypeError('The ' + label + ' store contains invalid JSON. No data was changed.');
  }
}

function readTrash(storage) {
  assertStorage(storage);
  const value = safeParse(storage.getItem(DELETED_STUDIES_STORAGE_KEY), [], 'Recently Deleted');
  if (!Array.isArray(value)) throw new TypeError('The Recently Deleted store is not a list. No data was changed.');
  const ids = new Set();
  const passageKeys = new Set();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        typeof item.id !== 'string' || !item.id.trim() ||
        typeof item.deletedAt !== 'string' || !Number.isFinite(Date.parse(item.deletedAt)) ||
        !item.record || typeof item.record !== 'object' || Array.isArray(item.record)) {
      throw new TypeError('Recently Deleted contains an invalid entry. No data was changed; export the workspace before attempting repair.');
    }
    const identity = normalizeIdentity(item.book, item.chapter);
    if (ids.has(item.id) || passageKeys.has(identity.key)) {
      throw new TypeError('Recently Deleted contains duplicate study identities. No data was changed; export the workspace before attempting repair.');
    }
    ids.add(item.id);
    passageKeys.add(identity.key);
  }
  return value;
}

function readDraftMap(storage) {
  assertStorage(storage);
  const parsed = safeParse(storage.getItem(PREVIEW_DRAFTS_STORAGE_KEY), {}, 'Study Library');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('The Study Library store is invalid. No data was changed.');
  }
  return parsed;
}

function commitWrites(storage, writes) {
  const before = writes.map(([key]) => [key, storage.getItem(key)]);
  const attempted = [];
  try {
    for (const [key, value] of writes) {
      attempted.push(key);
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const key of attempted.reverse()) {
      const previous = before.find(entry => entry[0] === key)?.[1] ?? null;
      try {
        if (previous === null) storage.removeItem(key);
        else storage.setItem(key, previous);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    if (rollbackErrors.length) {
      throw new Error('Study recovery could not complete, and rollback was incomplete. Export your current workspace before continuing. Original error: ' + message);
    }
    throw new Error('Study recovery was not saved. All attempted changes were rolled back. ' + message);
  }
}

function serialize(record) {
  return JSON.stringify(record);
}


function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inspectStudyRecord(record, store, location, issues) {
  if (!isPlainRecord(record)) {
    issues.push({
      severity: 'error', code: 'invalid_study_record', store, location,
      message: 'The study record is not a valid object.',
      recommendedAction: 'Export the workspace before attempting recovery. Do not overwrite this record.'
    });
    return;
  }
  for (const stage of STAGES) {
    if (typeof record[stage] !== 'string') {
      issues.push({
        severity: 'warning', code: 'missing_stage_text', store, location,
        message: 'The ' + stage + ' note field is missing or is not text.',
        recommendedAction: 'Keep the original record in a backup. Review this stage before restoring or editing the study.'
      });
    } else if (record[stage].length > 200000) {
      issues.push({
        severity: 'warning', code: 'large_stage_text', store, location,
        message: 'The ' + stage + ' note field exceeds the supported 200,000-character limit.',
        recommendedAction: 'Export the record and inspect the note content before importing it into another workspace.'
      });
    }
  }
  if (record.activeStage !== undefined && !STAGES.includes(record.activeStage)) {
    issues.push({
      severity: 'warning', code: 'invalid_active_stage', store, location,
      message: 'The saved active stage is not one of the four study stages.',
      recommendedAction: 'The application may default this study to Observe. Review the stage selection before continuing.'
    });
  }
  if (record.versionHistory !== undefined) {
    const history = record.versionHistory;
    let valid = Array.isArray(history) && history.length <= 8;
    const ids = new Set();
    if (Array.isArray(history)) {
      for (const snapshot of history) {
        const sections = snapshot && snapshot.sections;
        const snapshotValid = isPlainRecord(snapshot) &&
          typeof snapshot.id === 'string' && snapshot.id.length > 0 && snapshot.id.length <= 100 &&
          typeof snapshot.savedAt === 'string' && Number.isFinite(Date.parse(snapshot.savedAt)) &&
          isPlainRecord(sections) &&
          STAGES.every(stage => typeof sections[stage] === 'string' && sections[stage].length <= 200000) &&
          (snapshot.activeStage === undefined || STAGES.includes(snapshot.activeStage));
        if (!snapshotValid || ids.has(snapshot.id)) valid = false;
        if (typeof snapshot?.id === 'string') ids.add(snapshot.id);
      }
    }
    if (!valid) {
      issues.push({
        severity: 'warning', code: 'invalid_note_history', store, location,
        message: 'The note-version history contains an invalid snapshot, duplicate ID, or more than eight entries.',
        recommendedAction: 'Export the workspace before editing note history. Invalid snapshots may be omitted by the normal history reader.'
      });
    }
  }
}

/**
 * Read-only integrity audit of the preview Study Library and Recently Deleted
 * stores. This function never writes, normalizes, repairs or removes data.
 */
export function auditStudyRecoveryState(storage) {
  assertStorage(storage);
  const issues = [];
  let unreadable = false;
  let activeStudyCount = 0;
  let deletedStudyCount = 0;

  function readStore(key, label, isValidRoot, fallback) {
    let raw;
    try {
      raw = storage.getItem(key);
    } catch (error) {
      unreadable = true;
      issues.push({
        severity: 'error', code: 'storage_read_failed', store: label, location: label,
        message: 'The ' + label + ' store could not be read: ' + (error instanceof Error ? error.message : String(error)),
        recommendedAction: 'Do not continue editing this store. Check browser storage availability and preserve an external archive.'
      });
      return null;
    }
    if (raw === null) return clone(fallback);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      unreadable = true;
      issues.push({
        severity: 'error', code: 'invalid_json', store: label, location: label,
        message: 'The ' + label + ' store contains invalid JSON.',
        recommendedAction: 'Do not reset or overwrite the store. Export or copy the raw browser data before attempting repair.'
      });
      return null;
    }
    if (!isValidRoot(parsed)) {
      unreadable = true;
      issues.push({
        severity: 'error', code: 'invalid_store_root', store: label, location: label,
        message: 'The ' + label + ' store has an unexpected data structure.',
        recommendedAction: 'Preserve the raw store and a workspace archive before attempting any repair.'
      });
      return null;
    }
    return parsed;
  }

  const drafts = readStore(
    PREVIEW_DRAFTS_STORAGE_KEY,
    'Study Library',
    value => isPlainRecord(value),
    {}
  );
  if (drafts) {
    const canonicalIdentities = new Set();
    for (const [key, record] of Object.entries(drafts)) {
      activeStudyCount++;
      const parts = key.split('|');
      if (parts.length !== 2) {
        issues.push({
          severity: 'error', code: 'invalid_active_passage_key', store: 'Study Library', location: key,
          message: 'The active study key is not in Book|Chapter format.',
          recommendedAction: 'Export the workspace and inspect this key before changing the active Study Library.'
        });
        continue;
      }
      try {
        const identity = normalizeIdentity(parts[0], parts[1]);
        const bookInfo = getBibleBook(identity.book);
        const canonicalKey = bookInfo.name + '|' + identity.chapter;
        if (key !== canonicalKey) {
          issues.push({
            severity: 'warning', code: 'noncanonical_active_passage_key', store: 'Study Library', location: key,
            message: 'The active study key is valid but is not in canonical Bible-book and chapter format.',
            recommendedAction: 'Review this passage key before exporting or moving the study.'
          });
        }
        if (canonicalIdentities.has(canonicalKey)) {
          issues.push({
            severity: 'error', code: 'duplicate_active_passage', store: 'Study Library', location: canonicalKey,
            message: 'More than one active record resolves to the same canonical Bible passage.',
            recommendedAction: 'Keep an untouched workspace archive and resolve the duplicate records explicitly.'
          });
        }
        canonicalIdentities.add(canonicalKey);
      } catch {
        issues.push({
          severity: 'error', code: 'invalid_active_passage', store: 'Study Library', location: key,
          message: 'The active study key does not identify a valid Bible book and chapter.',
          recommendedAction: 'Preserve the raw record and inspect its passage identity before attempting recovery.'
        });
      }
      inspectStudyRecord(record, 'Study Library', key, issues);
    }
  }

  const trash = readStore(
    DELETED_STUDIES_STORAGE_KEY,
    'Recently Deleted',
    Array.isArray,
    []
  );
  if (trash) {
    deletedStudyCount = trash.length;
    const ids = new Set();
    const passageKeys = new Set();
    for (let index = 0; index < trash.length; index++) {
      const item = trash[index];
      const location = item && typeof item.id === 'string' ? item.id : 'entry ' + (index + 1);
      if (!isPlainRecord(item) ||
          typeof item.id !== 'string' || !item.id.trim() ||
          typeof item.deletedAt !== 'string' || !Number.isFinite(Date.parse(item.deletedAt)) ||
          !isPlainRecord(item.record)) {
        issues.push({
          severity: 'error', code: 'invalid_deleted_entry', store: 'Recently Deleted', location,
          message: 'A Recently Deleted entry is missing a valid ID, deletion date, passage record or record object.',
          recommendedAction: 'Do not restore or permanently delete this entry. Export the raw workspace data first.'
        });
        continue;
      }
      let identity;
      try {
        identity = normalizeIdentity(item.book, item.chapter);
      } catch {
        issues.push({
          severity: 'error', code: 'invalid_deleted_passage', store: 'Recently Deleted', location,
          message: 'The deleted study does not identify a valid Bible book and chapter.',
          recommendedAction: 'Preserve the entry and inspect its passage identity before attempting recovery.'
        });
        inspectStudyRecord(item.record, 'Recently Deleted', location, issues);
        continue;
      }
      if (ids.has(item.id)) {
        issues.push({
          severity: 'error', code: 'duplicate_deleted_id', store: 'Recently Deleted', location,
          message: 'The same deleted-study ID appears more than once.',
          recommendedAction: 'Do not restore or permanently delete entries until the duplicate IDs have been reviewed.'
        });
      }
      if (passageKeys.has(identity.key)) {
        issues.push({
          severity: 'error', code: 'duplicate_deleted_passage', store: 'Recently Deleted', location,
          message: 'More than one deleted record exists for the same Bible passage.',
          recommendedAction: 'Preserve an archive and resolve the duplicate deleted records explicitly.'
        });
      }
      ids.add(item.id);
      passageKeys.add(identity.key);
      inspectStudyRecord(item.record, 'Recently Deleted', location, issues);
    }
  }

  const errors = issues.filter(issue => issue.severity === 'error').length;
  const warnings = issues.length - errors;
  return {
    status: unreadable ? 'unreadable' : errors ? 'attention' : warnings ? 'review' : 'healthy',
    inspectedAt: new Date().toISOString(),
    readOnly: true,
    activeStudyCount,
    deletedStudyCount,
    issueCount: issues.length,
    errorCount: errors,
    warningCount: warnings,
    issues
  };
}

export function listDeletedStudies(storage) {
  return readTrash(storage).slice().sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));
}

export function softDeleteStudy(storage, book, chapter, deletedAt = new Date().toISOString()) {
  const identity = normalizeIdentity(book, chapter);
  if (typeof deletedAt !== 'string' || !Number.isFinite(Date.parse(deletedAt))) {
    throw new TypeError('A valid deletion timestamp is required.');
  }
  const drafts = readDraftMap(storage);
  const record = drafts[identity.key];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('This study is no longer in the active Study Library.');
  }
  const trash = readTrash(storage);
  if (trash.some(item => item.book === identity.book && item.chapter === identity.chapter)) {
    throw new Error('This study is already in Recently Deleted.');
  }
  const entry = {
    id: 'deleted-study-' + identity.book.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + identity.chapter + '-' + Date.parse(deletedAt),
    book: identity.book,
    chapter: identity.chapter,
    deletedAt: new Date(deletedAt).toISOString(),
    record: clone(record)
  };
  const nextDrafts = { ...drafts };
  delete nextDrafts[identity.key];
  commitWrites(storage, [
    [PREVIEW_DRAFTS_STORAGE_KEY, serialize(nextDrafts)],
    [DELETED_STUDIES_STORAGE_KEY, serialize([...trash, entry])]
  ]);
  return clone(entry);
}

export function restoreDeletedStudy(storage, id) {
  const trash = readTrash(storage);
  const entry = trash.find(item => item.id === id);
  if (!entry) throw new Error('This deleted study could not be found.');
  const identity = normalizeIdentity(entry.book, entry.chapter);
  const drafts = readDraftMap(storage);
  if (Object.prototype.hasOwnProperty.call(drafts, identity.key)) {
    throw new Error('A study for ' + identity.book + ' ' + identity.chapter + ' already exists. Rename or move that study before restoring this copy.');
  }
  const record = clone(entry.record);
  STAGES.forEach(stage => {
    if (typeof record[stage] !== 'string') record[stage] = '';
  });
  if (!STAGES.includes(record.activeStage)) record.activeStage = 'observe';
  const nextTrash = trash.filter(item => item.id !== id);
  commitWrites(storage, [
    [PREVIEW_DRAFTS_STORAGE_KEY, serialize({ ...drafts, [identity.key]: record })],
    [DELETED_STUDIES_STORAGE_KEY, serialize(nextTrash)]
  ]);
  return { book: identity.book, chapter: identity.chapter, activeStage: record.activeStage };
}

export function permanentlyDeleteStudy(storage, id) {
  const trash = readTrash(storage);
  const entry = trash.find(item => item.id === id);
  if (!entry) throw new Error('This deleted study could not be found.');
  const nextTrash = trash.filter(item => item.id !== id);
  commitWrites(storage, [[DELETED_STUDIES_STORAGE_KEY, serialize(nextTrash)]]);
  return { book: entry.book, chapter: entry.chapter };
}
