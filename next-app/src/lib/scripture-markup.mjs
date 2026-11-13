export const PREVIEW_MARKUP_STORAGE_KEY = 'ibs-next-generation-preview-scripture-markup-v1';

export const SCRIPTURE_MARKUP_TYPES = Object.freeze([
  { id: 'key-word', label: 'Key word', symbol: 'KW' },
  { id: 'repeated-idea', label: 'Repeated idea', symbol: 'REP' },
  { id: 'contrast', label: 'Contrast', symbol: '≠' },
  { id: 'command', label: 'Command', symbol: '!' },
  { id: 'promise', label: 'Promise', symbol: '★' },
  { id: 'question', label: 'Question', symbol: '?' }
]);

function normalizeMarkup(input) {
  const result = Object.create(null);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  Object.entries(input).forEach(([passage, verses]) => {
    if (typeof passage !== 'string' || !/^.+\|\d+$/.test(passage) || !verses || typeof verses !== 'object' || Array.isArray(verses)) return;
    const cleanVerses = Object.create(null);
    Object.entries(verses).forEach(([verse, tags]) => {
      const number = Number(verse);
      if (!Number.isInteger(number) || number < 1 || !Array.isArray(tags)) return;
      const valid = Array.from(new Set(tags.filter(tag => SCRIPTURE_MARKUP_TYPES.some(type => type.id === tag))));
      if (valid.length) cleanVerses[String(number)] = valid;
    });
    if (Object.keys(cleanVerses).length) result[passage] = cleanVerses;
  });
  return result;
}

export function readPreviewMarkup(storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return Object.create(null);
    return normalizeMarkup(JSON.parse(target.getItem(PREVIEW_MARKUP_STORAGE_KEY) || 'null'));
  } catch (_) {
    return Object.create(null);
  }
}

export function writePreviewMarkup(markup, storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return false;
    target.setItem(PREVIEW_MARKUP_STORAGE_KEY, JSON.stringify(normalizeMarkup(markup)));
    return true;
  } catch (_) {
    return false;
  }
}

export function toggleVerseMarkup(markup, passageKey, verse, tag) {
  if (!SCRIPTURE_MARKUP_TYPES.some(type => type.id === tag)) return markup;
  const current = normalizeMarkup(markup);
  const verses = { ...(current[passageKey] || {}) };
  const tags = new Set(verses[String(verse)] || []);
  if (tags.has(tag)) tags.delete(tag); else tags.add(tag);
  if (tags.size) verses[String(verse)] = Array.from(tags);
  else delete verses[String(verse)];
  if (Object.keys(verses).length) current[passageKey] = verses;
  else delete current[passageKey];
  return current;
}
