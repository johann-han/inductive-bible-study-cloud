const BIBLE_BOOK_ROWS = [
  ['Genesis', 'OT', 50, 'GEN'], ['Exodus', 'OT', 40, 'EXO'], ['Leviticus', 'OT', 27, 'LEV'],
  ['Numbers', 'OT', 36, 'NUM'], ['Deuteronomy', 'OT', 34, 'DEU'], ['Joshua', 'OT', 24, 'JOS'],
  ['Judges', 'OT', 21, 'JDG'], ['Ruth', 'OT', 4, 'RUT'], ['1 Samuel', 'OT', 31, '1SA'],
  ['2 Samuel', 'OT', 24, '2SA'], ['1 Kings', 'OT', 22, '1KI'], ['2 Kings', 'OT', 25, '2KI'],
  ['1 Chronicles', 'OT', 29, '1CH'], ['2 Chronicles', 'OT', 36, '2CH'], ['Ezra', 'OT', 10, 'EZR'],
  ['Nehemiah', 'OT', 13, 'NEH'], ['Esther', 'OT', 10, 'EST'], ['Job', 'OT', 42, 'JOB'],
  ['Psalms', 'OT', 150, 'PSA'], ['Proverbs', 'OT', 31, 'PRO'], ['Ecclesiastes', 'OT', 12, 'ECC'],
  ['Song of Solomon', 'OT', 8, 'SNG'], ['Isaiah', 'OT', 66, 'ISA'], ['Jeremiah', 'OT', 52, 'JER'],
  ['Lamentations', 'OT', 5, 'LAM'], ['Ezekiel', 'OT', 48, 'EZK'], ['Daniel', 'OT', 12, 'DAN'],
  ['Hosea', 'OT', 14, 'HOS'], ['Joel', 'OT', 3, 'JOL'], ['Amos', 'OT', 9, 'AMO'],
  ['Obadiah', 'OT', 1, 'OBA'], ['Jonah', 'OT', 4, 'JON'], ['Micah', 'OT', 7, 'MIC'],
  ['Nahum', 'OT', 3, 'NAM'], ['Habakkuk', 'OT', 3, 'HAB'], ['Zephaniah', 'OT', 3, 'ZEP'],
  ['Haggai', 'OT', 2, 'HAG'], ['Zechariah', 'OT', 14, 'ZEC'], ['Malachi', 'OT', 4, 'MAL'],
  ['Matthew', 'NT', 28, 'MAT'], ['Mark', 'NT', 16, 'MRK'], ['Luke', 'NT', 24, 'LUK'],
  ['John', 'NT', 21, 'JHN'], ['Acts', 'NT', 28, 'ACT'], ['Romans', 'NT', 16, 'ROM'],
  ['1 Corinthians', 'NT', 16, '1CO'], ['2 Corinthians', 'NT', 13, '2CO'], ['Galatians', 'NT', 6, 'GAL'],
  ['Ephesians', 'NT', 6, 'EPH'], ['Philippians', 'NT', 4, 'PHP'], ['Colossians', 'NT', 4, 'COL'],
  ['1 Thessalonians', 'NT', 5, '1TH'], ['2 Thessalonians', 'NT', 3, '2TH'], ['1 Timothy', 'NT', 6, '1TI'],
  ['2 Timothy', 'NT', 4, '2TI'], ['Titus', 'NT', 3, 'TIT'], ['Philemon', 'NT', 1, 'PHM'],
  ['Hebrews', 'NT', 13, 'HEB'], ['James', 'NT', 5, 'JAS'], ['1 Peter', 'NT', 5, '1PE'],
  ['2 Peter', 'NT', 3, '2PE'], ['1 John', 'NT', 5, '1JN'], ['2 John', 'NT', 1, '2JN'],
  ['3 John', 'NT', 1, '3JN'], ['Jude', 'NT', 1, 'JUD'], ['Revelation', 'NT', 22, 'REV']
];

export const BIBLE_BOOKS = Object.freeze(BIBLE_BOOK_ROWS.map(function (row) {
  return Object.freeze({ name: row[0], testament: row[1], chapters: row[2], helloAoId: row[3] });
}));

export const BIBLE_TRANSLATIONS = Object.freeze(['KJV', 'BSB', 'ASV', 'WEB', 'BBE']);
export const LAST_READING_STORAGE_KEY = 'inductive-bible-study-last-reading-v1';

export function getBibleBook(name) {
  return BIBLE_BOOKS.find(function (book) { return book.name === name; });
}

export function readSavedPassage(storage) {
  try {
    const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!targetStorage) return null;
    const saved = JSON.parse(targetStorage.getItem(LAST_READING_STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return null;
    const book = getBibleBook(saved.book);
    const chapter = Number(saved.chapter);
    const translation = String(saved.translation || 'KJV').toUpperCase();
    if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;
    return {
      book: book.name,
      chapter: chapter,
      translation: BIBLE_TRANSLATIONS.includes(translation) ? translation : 'KJV'
    };
  } catch (_) {
    return null;
  }
}

export function writeSavedPassage(passage, storage) {
  try {
    const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    const book = getBibleBook(passage && passage.book);
    const chapter = Number(passage && passage.chapter);
    const translation = String(passage && passage.translation || 'KJV').toUpperCase();
    if (!targetStorage || !book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return false;
    targetStorage.setItem(LAST_READING_STORAGE_KEY, JSON.stringify({
      book: book.name,
      chapter: chapter,
      translation: BIBLE_TRANSLATIONS.includes(translation) ? translation : 'KJV'
    }));
    return true;
  } catch (_) {
    return false;
  }
}

async function requestJson(url, fetcher, parentSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 10000);
  const abortFromParent = function () { controller.abort(); };
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener('abort', abortFromParent, { once: true });
  }
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response || !response.ok) {
      throw new Error('The Scripture source returned HTTP ' + (response ? response.status : 'unknown') + '.');
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
    if (parentSignal) parentSignal.removeEventListener('abort', abortFromParent);
  }
}

function readHelloAoVerses(payload) {
  const content = payload && payload.chapter && Array.isArray(payload.chapter.content)
    ? payload.chapter.content : [];
  return content
    .filter(function (item) {
      return item && item.type === 'verse' && Number.isFinite(Number(item.number));
    })
    .map(function (item) {
      return { number: Number(item.number), text: String(item.text || '').trim() };
    })
    .filter(function (verse) { return verse.number > 0 && verse.text.length > 0; })
    .sort(function (a, b) { return a.number - b.number; });
}

function readBibleApiVerses(payload) {
  const rows = payload && Array.isArray(payload.verses) ? payload.verses : [];
  return rows
    .map(function (item, index) {
      const number = Number(item && (item.verse || item.verse_number || item.number) || index + 1);
      const text = String(item && item.text || '').trim().replace(/^\d+\s*/, '').replace(/\s+/g, ' ');
      return { number: number, text: text };
    })
    .filter(function (verse) { return Number.isInteger(verse.number) && verse.number > 0 && verse.text.length > 0; })
    .sort(function (a, b) { return a.number - b.number; });
}

export async function fetchBibleChapter(bookName, chapterNumber, translation, options) {
  const book = getBibleBook(bookName);
  const chapter = Number(chapterNumber);
  const selectedTranslation = String(translation || 'KJV').toUpperCase();
  const fetcher = options && options.fetcher ? options.fetcher : fetch;
  const signal = options && options.signal;

  if (!book) throw new Error('Choose a book from the 66-book Bible canon.');
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    throw new Error(book.name + ' has ' + book.chapters + ' chapters. Choose a valid chapter.');
  }
  if (!BIBLE_TRANSLATIONS.includes(selectedTranslation)) {
    throw new Error('The selected Bible translation is not supported in this preview.');
  }

  if (selectedTranslation === 'KJV' || selectedTranslation === 'BSB') {
    const sourceId = selectedTranslation === 'KJV' ? 'eng_kjv' : 'BSB';
    const url = 'https://bible.helloao.org/api/' + sourceId + '/' + book.helloAoId + '/' + chapter + '.simple.json';
    try {
      const payload = await requestJson(url, fetcher, signal);
      const verses = readHelloAoVerses(payload);
      if (verses.length) {
        return { book: book.name, chapter: chapter, translation: selectedTranslation, source: 'Free Use Bible API', verses: verses };
      }
      throw new Error('The source returned no verse text.');
    } catch (error) {
      if (signal && signal.aborted) throw error;
      if (selectedTranslation === 'BSB') {
        throw new Error('Could not load ' + book.name + ' ' + chapter + ' in BSB. The BSB source is unavailable; no other translation was substituted.');
      }
    }
  }

  const apiUrl = 'https://bible-api.com/' + encodeURIComponent(book.name + ' ' + chapter) +
    '?translation=' + selectedTranslation.toLowerCase();
  const fallbackPayload = await requestJson(apiUrl, fetcher, signal);
  const fallbackVerses = readBibleApiVerses(fallbackPayload);
  if (!fallbackVerses.length) {
    throw new Error('The Scripture source returned no verses for ' + book.name + ' ' + chapter + ' (' + selectedTranslation + ').');
  }
  return {
    book: book.name,
    chapter: chapter,
    translation: selectedTranslation,
    source: selectedTranslation === 'KJV' ? 'bible-api.com · KJV fallback' : 'bible-api.com',
    verses: fallbackVerses
  };
}
