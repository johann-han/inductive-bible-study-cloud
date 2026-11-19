export const PREVIEW_WORD_MARKUP_STORAGE_KEY = 'ibs-next-generation-preview-word-markup-v1';

const VALID_TAGS = new Set(['key-word', 'repeated-idea', 'contrast', 'command', 'promise', 'question']);

function normalizeWordMarkup(input) {
  const result = Object.create(null);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  for (const [passage, verses] of Object.entries(input)) {
    if (typeof passage !== 'string' || !/^.+\|\d+$/.test(passage) || !verses || typeof verses !== 'object' || Array.isArray(verses)) continue;
    const clean = Object.create(null);
    for (const [verse, ranges] of Object.entries(verses)) {
      if (!Number.isInteger(Number(verse)) || Number(verse) < 1 || !Array.isArray(ranges)) continue;
      const valid = ranges.filter(range => range && Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 0 && range.end > range.start && Array.isArray(range.tags))
        .map(range => ({ start: range.start, end: range.end, tags: Array.from(new Set(range.tags.filter(tag => VALID_TAGS.has(tag)))) }))
        .filter(range => range.tags.length);
      if (valid.length) clean[String(verse)] = valid;
    }
    if (Object.keys(clean).length) result[passage] = clean;
  }
  return result;
}

export function readPreviewWordMarkup(storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    return target ? normalizeWordMarkup(JSON.parse(target.getItem(PREVIEW_WORD_MARKUP_STORAGE_KEY) || 'null')) : Object.create(null);
  } catch (_) { return Object.create(null); }
}

export function writePreviewWordMarkup(markup, storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return false;
    target.setItem(PREVIEW_WORD_MARKUP_STORAGE_KEY, JSON.stringify(normalizeWordMarkup(markup)));
    return true;
  } catch (_) { return false; }
}

export function toggleWordMarkup(markup, passageKey, verse, start, end, tag) {
  if (!VALID_TAGS.has(tag) || !Number.isInteger(verse) || verse < 1 || !Number.isInteger(start) || start < 0 || !Number.isInteger(end) || end <= start) return markup;
  const current = normalizeWordMarkup(markup);
  const verses = { ...(current[passageKey] || {}) };
  const ranges = [...(verses[String(verse)] || [])];
  const index = ranges.findIndex(range => range.start === start && range.end === end);
  if (index >= 0) {
    const tags = new Set(ranges[index].tags);
    if (tags.has(tag)) tags.delete(tag); else tags.add(tag);
    if (tags.size) ranges[index] = { ...ranges[index], tags: [...tags] };
    else ranges.splice(index, 1);
  } else ranges.push({ start, end, tags: [tag] });
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  if (ranges.length) verses[String(verse)] = ranges; else delete verses[String(verse)];
  if (Object.keys(verses).length) current[passageKey] = verses; else delete current[passageKey];
  return current;
}
