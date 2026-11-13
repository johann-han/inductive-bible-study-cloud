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


export const PREVIEW_DRAFTS_STORAGE_KEY = 'ibs-next-generation-preview-drafts-v1';

const PREVIEW_STUDY_STAGES = ['observe', 'interpret', 'doctrine', 'apply'];

function normalizePreviewDrafts(input) {
  const result = Object.create(null);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  Object.entries(input).forEach(function (entry) {
    const parts = String(entry[0]).split('|');
    if (parts.length !== 2) return;
    const book = getBibleBook(parts[0]);
    const chapter = Number(parts[1]);
    if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return;
    const source = entry[1];
    if (!source || typeof source !== 'object' || Array.isArray(source)) return;
    const notes = {};
    PREVIEW_STUDY_STAGES.forEach(function (stage) {
      notes[stage] = typeof source[stage] === 'string' ? source[stage] : '';
    });
    const savedActiveStage = String(source.activeStage || '').toLowerCase();
    notes.activeStage = PREVIEW_STUDY_STAGES.includes(savedActiveStage) ? savedActiveStage : 'observe';
    result[book.name + '|' + chapter] = notes;
  });
  return result;
}

export function listPreviewDraftEntries(drafts) {
  const normalized = normalizePreviewDrafts(drafts);
  const bookOrder = new Map(BIBLE_BOOKS.map(function (book, index) { return [book.name, index]; }));
  return Object.entries(normalized).map(function (entry) {
    const parts = entry[0].split('|');
    const book = parts[0];
    const chapter = Number(parts[1]);
    const notes = entry[1];
    const writtenStages = PREVIEW_STUDY_STAGES.filter(function (stage) {
      return notes[stage].trim().length > 0;
    });
    const activeStage = notes.activeStage || 'observe';
    const activeText = notes[activeStage] || '';
    const latestWrittenStage = writtenStages.length ? writtenStages[writtenStages.length - 1] : 'observe';
    const previewText = (activeText || notes[latestWrittenStage] || '').trim();
    const wordCount = writtenStages.reduce(function (total, stage) {
      const content = notes[stage].trim();
      return total + (content ? content.split(/\s+/).length : 0);
    }, 0);
    return {
      book: book,
      chapter: chapter,
      activeStage: activeStage,
      writtenStages: writtenStages,
      stageCount: writtenStages.length,
      wordCount: wordCount,
      preview: previewText.slice(0, 220)
    };
  }).filter(function (entry) {
    return entry.stageCount > 0;
  }).sort(function (a, b) {
    return (bookOrder.get(a.book) || 0) - (bookOrder.get(b.book) || 0) || a.chapter - b.chapter;
  });
}

export function readPreviewDrafts(storage) {
  try {
    const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!targetStorage) return Object.create(null);
    const raw = targetStorage.getItem(PREVIEW_DRAFTS_STORAGE_KEY);
    return raw ? normalizePreviewDrafts(JSON.parse(raw)) : Object.create(null);
  } catch (_) {
    return Object.create(null);
  }
}

export function writePreviewDrafts(drafts, storage) {
  try {
    const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!targetStorage) return false;
    targetStorage.setItem(PREVIEW_DRAFTS_STORAGE_KEY, JSON.stringify(normalizePreviewDrafts(drafts)));
    return true;
  } catch (_) {
    return false;
  }
}
export function normalizeStrongsId(value) {
  const match = String(value || '').trim().toUpperCase().match(/^([HG])(\d{1,5})[A-Z]?$/);
  return match ? match[1] + match[2].padStart(4, '0') : null;
}

function normalizeAnnotationRows(rows, verseText) {
  if (!Array.isArray(rows) || !verseText) return [];
  return rows.map(function (annotation) {
    const ids = Array.isArray(annotation && annotation.strongs) ? annotation.strongs : [];
    const strongs = Array.from(new Set(ids.map(normalizeStrongsId).filter(Boolean)));
    return {
      start: Number(annotation && annotation.start),
      end: Number(annotation && annotation.end),
      strongs: strongs,
      originalText: String(annotation && annotation.originalText || ''),
      transliteration: String(annotation && (annotation.transliteration || annotation.translit) || ''),
      parsing: String(annotation && annotation.parsing || ''),
      parsingFull: String(annotation && annotation.parsingFull || ''),
      language: String(annotation && annotation.language || ''),
      gloss: String(annotation && annotation.gloss || '')
    };
  }).filter(function (annotation) {
    return annotation.strongs.length > 0 &&
      Number.isInteger(annotation.start) && Number.isInteger(annotation.end) &&
      annotation.start >= 0 && annotation.end > annotation.start &&
      annotation.end <= verseText.length;
  }).sort(function (a, b) { return a.start - b.start || a.end - b.end; });
}

function readKjvAnnotations(payload, verses) {
  const byVerse = payload && payload.verses && typeof payload.verses === 'object' ? payload.verses : {};
  const textByNumber = new Map(verses.map(function (verse) { return [String(verse.number), verse.text]; }));
  const result = {};
  Object.entries(byVerse).forEach(function (entry) {
    const text = textByNumber.get(String(entry[0]));
    if (!text || !Array.isArray(entry[1])) return;
    result[String(entry[0])] = normalizeAnnotationRows(entry[1], text);
  });
  return result;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
}

function mapBsbWordsToAnnotations(verseText, words) {
  const source = String(verseText || '');
  if (!source || !Array.isArray(words)) return [];
  const orderedWords = words.slice().sort(function (a, b) {
    return (Number(a && a.bsbPos) || Number.MAX_SAFE_INTEGER) -
      (Number(b && b.bsbPos) || Number.MAX_SAFE_INTEGER) ||
      (Number(a && a.pos) || Number.MAX_SAFE_INTEGER) -
      (Number(b && b.pos) || Number.MAX_SAFE_INTEGER);
  });
  const annotations = [];
  let cursor = 0;
  for (const word of orderedWords) {
    const strongs = normalizeStrongsId(word && word.strongs);
    const gloss = String(word && word.gloss || '').trim().replace(/\s+/g, ' ');
    if (!strongs || !gloss) continue;
    const phrasePattern = gloss.split(' ').map(escapeRegExp).join('\\s+');
    const matcher = new RegExp('(^|[^A-Za-z0-9])(' + phrasePattern + ')(?=$|[^A-Za-z0-9])', 'ig');
    matcher.lastIndex = cursor;
    const match = matcher.exec(source);
    if (!match) continue;
    const start = match.index + match[1].length;
    const end = start + match[2].length;
    if (start < cursor || end <= start || end > source.length) continue;
    annotations.push({
      start: start, end: end, strongs: [strongs],
      originalText: String(word.text || ''),
      transliteration: String(word.transliteration || ''),
      parsing: String(word.parsing || ''),
      parsingFull: String(word.parsingFull || ''),
      language: String(word.language || ''),
      gloss: gloss
    });
    cursor = end;
  }
  return annotations;
}

function readBsbAnnotations(payload, verses) {
  const content = payload && payload.chapter && Array.isArray(payload.chapter.content)
    ? payload.chapter.content : [];
  const verseMap = new Map(verses.map(function (verse) { return [Number(verse.number), verse.text]; }));
  const result = {};
  for (const item of content) {
    const number = Number(item && item.verse);
    const verseText = verseMap.get(number);
    if (!Number.isInteger(number) || !verseText || !Array.isArray(item.words)) continue;
    result[String(number)] = mapBsbWordsToAnnotations(verseText, item.words);
  }
  return result;
}

export async function fetchStrongsLexicon(strongsId, options) {
  const id = normalizeStrongsId(strongsId);
  if (!id) throw new Error('The selected Strong’s number is invalid.');
  const fetcher = options && options.fetcher ? options.fetcher : fetch;
  const payload = await requestJson(
    'https://bible.helloao.org/api/d/stepbible-lexicon/lexicon/' + encodeURIComponent(id) + '.json',
    fetcher,
    options && options.signal
  );
  const entry = payload && payload.entry;
  const senses = entry && Array.isArray(entry.senses) ? entry.senses : [];
  if (!senses.length) throw new Error('No verified lexicon entry is available for ' + id + '.');
  const glosses = Array.from(new Set(senses.map(function (sense) {
    return String(sense && sense.gloss || '').trim();
  }).filter(Boolean)));
  return {
    id: id,
    lemma: String(senses[0].lemma || entry.id || id),
    transliteration: String(senses[0].transliteration || 'Not supplied by source'),
    partOfSpeech: String(senses[0].partOfSpeech || 'Not supplied by source'),
    gloss: glosses.join('; ') || 'No gloss supplied by source',
    senses: senses.map(function (sense, index) {
      return {
        gloss: String(sense && sense.gloss || 'Sense ' + (index + 1)),
        definition: String(sense && sense.definition || 'No definition supplied for this sense.')
      };
    }),
    source: 'STEPBible Brief Lexicons / Tyndale House, Cambridge · CC BY 4.0',
    sourceUrl: 'https://bible.helloao.org/api/d/stepbible-lexicon/lexicon/' + encodeURIComponent(id) + '.json'
  };
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
        let annotations = {};
        if (selectedTranslation === 'KJV') {
          try {
            const wordPayload = await requestJson(
              'https://bible.helloao.org/api/eng_kjv/' + book.helloAoId + '/' + chapter + '.words.simple.json',
              fetcher,
              signal
            );
            annotations = readKjvAnnotations(wordPayload, verses);
          } catch (annotationError) {
            if (signal && signal.aborted) throw annotationError;
            // Scripture remains available; unverified or unavailable word tags are omitted.
          }
        } else if (selectedTranslation === 'BSB') {
          try {
            const interlinearPayload = await requestJson(
              'https://bible.helloao.org/api/d/bsb-interlinear/' + book.helloAoId + '/' + chapter + '.json',
              fetcher,
              signal
            );
            annotations = readBsbAnnotations(interlinearPayload, verses);
          } catch (annotationError) {
            if (signal && signal.aborted) throw annotationError;
            // BSB chapter text remains available when its optional interlinear layer is offline.
          }
        }
        return { book: book.name, chapter: chapter, translation: selectedTranslation, source: 'Free Use Bible API', verses: verses, annotations: annotations };
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
    verses: fallbackVerses,
    annotations: {}
  };
}
