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
