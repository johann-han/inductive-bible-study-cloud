import { BIBLE_BOOKS, getBibleBook } from './bible.mjs';

export const PREVIEW_CROSS_REFERENCES_STORAGE_KEY = 'ibs-next-generation-preview-cross-references-v1';

function normalizeReference(item) {
  if (!item || typeof item !== 'object') return null;
  const sourceBook = getBibleBook(item.sourceBook);
  const targetBook = getBibleBook(item.targetBook);
  const sourceChapter = Number(item.sourceChapter);
  const targetChapter = Number(item.targetChapter);
  const sourceVerse = item.sourceVerse == null || item.sourceVerse === '' ? null : Number(item.sourceVerse);
  const targetVerse = item.targetVerse == null || item.targetVerse === '' ? null : Number(item.targetVerse);
  if (!sourceBook || !targetBook ||
      !Number.isInteger(sourceChapter) || sourceChapter < 1 || sourceChapter > sourceBook.chapters ||
      !Number.isInteger(targetChapter) || targetChapter < 1 || targetChapter > targetBook.chapters ||
      (sourceVerse !== null && (!Number.isInteger(sourceVerse) || sourceVerse < 1 || sourceVerse > 300)) ||
      (targetVerse !== null && (!Number.isInteger(targetVerse) || targetVerse < 1 || targetVerse > 300))) return null;
  const id = typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id) ? item.id : null;
  if (!id) return null;
  return {
    id, sourceBook: sourceBook.name, sourceChapter, sourceVerse,
    targetBook: targetBook.name, targetChapter, targetVerse,
    note: typeof item.note === 'string' ? item.note.slice(0, 1200) : '',
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : ''
  };
}

export function readPreviewCrossReferences(storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return [];
    const parsed = JSON.parse(target.getItem(PREVIEW_CROSS_REFERENCES_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeReference).filter(Boolean);
  } catch (_) { return []; }
}

export function writePreviewCrossReferences(items, storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target || !Array.isArray(items)) return false;
    target.setItem(PREVIEW_CROSS_REFERENCES_STORAGE_KEY, JSON.stringify(items.map(normalizeReference).filter(Boolean)));
    return true;
  } catch (_) { return false; }
}

export function addPreviewCrossReference(items, reference) {
  const normalized = normalizeReference(reference);
  if (!normalized) return Array.isArray(items) ? items : [];
  const current = Array.isArray(items) ? items.filter(item => normalizeReference(item)) : [];
  if (current.some(item => item.id === normalized.id)) return current;
  return [normalized, ...current].slice(0, 500);
}

export function deletePreviewCrossReference(items, id) {
  return (Array.isArray(items) ? items : []).filter(item => item && item.id !== id);
}

export function formatCrossReference(reference) {
  const source = reference.sourceBook + ' ' + reference.sourceChapter + (reference.sourceVerse ? ':' + reference.sourceVerse : '');
  const target = reference.targetBook + ' ' + reference.targetChapter + (reference.targetVerse ? ':' + reference.targetVerse : '');
  return { source, target };
}
