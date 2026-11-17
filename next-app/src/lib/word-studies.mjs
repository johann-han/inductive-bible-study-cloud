import { BIBLE_TRANSLATIONS, getBibleBook } from './bible.mjs';

export const WORD_STUDIES_STORAGE_KEY = 'ibs-next-generation-preview-word-studies-v1';
export const MAX_WORD_STUDIES = 5000;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedString(value, maxLength, allowEmpty = true) {
  return typeof value === 'string' && value.length <= maxLength &&
    (allowEmpty || value.trim().length > 0);
}

export function isWordStudyRecord(value) {
  if (!isObject(value)) return false;
  const reference = value.reference;
  if (!isObject(reference)) return false;
  const book = getBibleBook(reference.book);
  const chapter = Number(reference.chapter);
  const verse = Number(reference.verse);
  const strongsId = typeof value.strongsId === 'string' ? value.strongsId.toUpperCase() : '';
  const sourceUrl = value.sourceUrl === undefined ? '' : value.sourceUrl;
  const senses = value.senses;
  return boundedString(value.id, 100, false) &&
    /^[HG]\d{1,6}$/.test(strongsId) &&
    boundedString(value.englishWord, 200, false) &&
    boundedString(value.lemma, 300, false) &&
    boundedString(value.transliteration, 300) &&
    boundedString(value.partOfSpeech, 100) &&
    boundedString(value.gloss, 5000) &&
    boundedString(value.originalText, 300) &&
    boundedString(value.language, 40, false) &&
    boundedString(value.parsing, 500) &&
    boundedString(value.parsingFull, 1000) &&
    boundedString(value.verseText, 10000) &&
    boundedString(value.source, 300, false) &&
    boundedString(sourceUrl, 2000) &&
    (!sourceUrl || /^https:\/\//i.test(sourceUrl)) &&
    boundedString(value.notes, 20000) &&
    Array.isArray(senses) && senses.length <= 50 &&
    senses.every(sense => isObject(sense) &&
      boundedString(sense.gloss, 500, false) &&
      boundedString(sense.definition, 5000)) &&
    Boolean(book) && Number.isInteger(chapter) && chapter >= 1 && chapter <= book.chapters &&
    Number.isInteger(verse) && verse >= 1 && verse <= 300 &&
    BIBLE_TRANSLATIONS.includes(reference.translation) &&
    typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt));
}

export function normalizeWordStudies(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input
    .filter(item => {
      if (!isWordStudyRecord(item) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, MAX_WORD_STUDIES)
    .map(item => ({
      ...item,
      strongsId: item.strongsId.toUpperCase(),
      senses: item.senses.map(sense => ({ gloss: sense.gloss, definition: sense.definition }))
    }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function readWordStudies(storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return [];
    return normalizeWordStudies(JSON.parse(target.getItem(WORD_STUDIES_STORAGE_KEY) || '[]'));
  } catch (_) {
    return [];
  }
}

export function writeWordStudies(records, storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return false;
    target.setItem(WORD_STUDIES_STORAGE_KEY, JSON.stringify(normalizeWordStudies(records)));
    return true;
  } catch (_) {
    return false;
  }
}

export function searchWordStudies(records, query = '') {
  const normalized = String(query || '').trim().toLocaleLowerCase();
  const ordered = normalizeWordStudies(records);
  if (!normalized) return ordered;
  return ordered.filter(record => [
    record.strongsId, record.englishWord, record.lemma, record.transliteration,
    record.partOfSpeech, record.gloss, record.originalText, record.language,
    record.parsing, record.parsingFull, record.verseText, record.notes,
    record.reference.book + ' ' + record.reference.chapter + ':' + record.reference.verse
  ].join(' ').toLocaleLowerCase().includes(normalized));
}
