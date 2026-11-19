import { BIBLE_BOOKS } from './bible.mjs';

export const STANDARD_XREF_SOURCE = Object.freeze({
  name: 'CrossReferences.org · Treasury of Scripture Knowledge',
  url: 'https://github.com/CrossReferences-org/bible-cross-references',
  license: 'CC BY 4.0',
  attribution: 'Cross-reference data derived from the Treasury of Scripture Knowledge, curated and published by CrossReferences.org, licensed under CC BY 4.0.',
  revision: '63385486c1ea4382d769275b15c95a24738701e5'
});

const RAW_BASE = 'https://raw.githubusercontent.com/CrossReferences-org/bible-cross-references/' + STANDARD_XREF_SOURCE.revision + '/tsv/';
const FILES = Object.freeze({ BSB: 'crossreferences_bsb.tsv', KJV: 'crossreferences_kjv.tsv' });
const BOOK_ALIASES = new Map();
const aliases = {
  'Gen':'Genesis','Ge':'Genesis','Genesis':'Genesis',
  'Exod':'Exodus','Ex':'Exodus','Exodus':'Exodus',
  'Lev':'Leviticus','Le':'Leviticus','Leviticus':'Leviticus',
  'Num':'Numbers','Nu':'Numbers','Numbers':'Numbers',
  'Deut':'Deuteronomy','Dt':'Deuteronomy','Deuteronomy':'Deuteronomy',
  'Josh':'Joshua','Jos':'Joshua','Joshua':'Joshua',
  'Judg':'Judges','Jdg':'Judges','Judges':'Judges',
  'Ruth':'Ruth',
  '1 Sam':'1 Samuel','1 Samuel':'1 Samuel','2 Sam':'2 Samuel','2 Samuel':'2 Samuel',
  '1 Kgs':'1 Kings','1 Kings':'1 Kings','2 Kgs':'2 Kings','2 Kings':'2 Kings',
  '1 Chr':'1 Chronicles','1 Chron':'1 Chronicles','1 Chronicles':'1 Chronicles',
  '2 Chr':'2 Chronicles','2 Chron':'2 Chronicles','2 Chronicles':'2 Chronicles',
  'Ezra':'Ezra','Neh':'Nehemiah','Nehemiah':'Nehemiah','Esth':'Esther','Esther':'Esther',
  'Job':'Job','Ps':'Psalms','Psa':'Psalms','Psalm':'Psalms','Psalms':'Psalms',
  'Prov':'Proverbs','Proverbs':'Proverbs','Eccl':'Ecclesiastes','Ecclesiastes':'Ecclesiastes',
  'Song':'Song of Solomon','Song of Solomon':'Song of Solomon','Isa':'Isaiah','Isaiah':'Isaiah',
  'Jer':'Jeremiah','Jeremiah':'Jeremiah','Lam':'Lamentations','Lamentations':'Lamentations',
  'Ezek':'Ezekiel','Eze':'Ezekiel','Ezekiel':'Ezekiel','Dan':'Daniel','Daniel':'Daniel',
  'Hos':'Hosea','Hosea':'Hosea','Joel':'Joel','Amos':'Amos','Obad':'Obadiah','Obadiah':'Obadiah',
  'Jonah':'Jonah','Mic':'Micah','Micah':'Micah','Nah':'Nahum','Nahum':'Nahum','Hab':'Habakkuk','Habakkuk':'Habakkuk',
  'Zeph':'Zephaniah','Zephaniah':'Zephaniah','Hag':'Haggai','Haggai':'Haggai','Zech':'Zechariah','Zechariah':'Zechariah',
  'Mal':'Malachi','Malachi':'Malachi',
  'Matt':'Matthew','Matthew':'Matthew','Mark':'Mark','Mk':'Mark','Luke':'Luke','Lk':'Luke','John':'John','Jn':'John',
  'Acts':'Acts','Rom':'Romans','Romans':'Romans',
  '1 Cor':'1 Corinthians','1 Corinthians':'1 Corinthians','2 Cor':'2 Corinthians','2 Corinthians':'2 Corinthians',
  'Gal':'Galatians','Galatians':'Galatians','Eph':'Ephesians','Ephesians':'Ephesians',
  'Phil':'Philippians','Philippians':'Philippians','Col':'Colossians','Colossians':'Colossians',
  '1 Thess':'1 Thessalonians','1 Thessalonians':'1 Thessalonians','2 Thess':'2 Thessalonians','2 Thessalonians':'2 Thessalonians',
  '1 Tim':'1 Timothy','1 Timothy':'1 Timothy','2 Tim':'2 Timothy','2 Timothy':'2 Timothy',
  'Titus':'Titus','Phlm':'Philemon','Phlem':'Philemon','Philem':'Philemon','Philemon':'Philemon','Heb':'Hebrews','Hebrews':'Hebrews',
  'Jas':'James','James':'James','1 Pet':'1 Peter','1 Peter':'1 Peter','2 Pet':'2 Peter','2 Peter':'2 Peter',
  '1 John':'1 John','2 John':'2 John','3 John':'3 John','Jude':'Jude','Rev':'Revelation','Revelation':'Revelation'
};
for (const [alias, name] of Object.entries(aliases)) BOOK_ALIASES.set(alias.toLowerCase().replace(/\./g, ''), name);
const BOOK_NAMES = [...BIBLE_BOOKS].map(book => book.name).sort((a,b)=>b.length-a.length);

export function parseStandardReference(value) {
  if (typeof value !== 'string') return null;
  const input = value.trim().replace(/\s+/g, ' ');
  const match = input.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!match) return null;
  const bookText = match[1].replace(/\.$/, '').trim();
  const book = BOOK_ALIASES.get(bookText.toLowerCase()) || BOOK_NAMES.find(name => name.toLowerCase() === bookText.toLowerCase());
  const chapter = Number(match[2]), verse = match[3] ? Number(match[3]) : null, endVerse = match[4] ? Number(match[4]) : verse;
  const metadata = BIBLE_BOOKS.find(item => item.name === book);
  if (!metadata || chapter < 1 || chapter > metadata.chapters || (verse !== null && (verse < 1 || endVerse < verse || endVerse > 300))) return null;
  return { book, chapter, verse, endVerse, label: input };
}

function parseRow(line, index) {
  const columns = line.split('\t');
  if (columns.length < 5) return null;
  const [sourceBookText, chapterText, verseText, anchor, referencesText] = columns;
  const sourceBook = BOOK_ALIASES.get(sourceBookText.trim().toLowerCase().replace(/\./g, '')) ||
    BOOK_NAMES.find(name => name.toLowerCase() === sourceBookText.trim().toLowerCase());
  const chapter = Number(chapterText), verse = Number(verseText);
  const book = BIBLE_BOOKS.find(item => item.name === sourceBook);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters || !Number.isInteger(verse) || verse < 1) return null;
  const references = referencesText.split('|').map(parseStandardReference).filter(Boolean);
  if (!references.length) return null;
  return { id: sourceBook + '.' + chapter + '.' + verse + '.' + index, book: sourceBook, chapter, verse, anchor: anchor.trim(), references };
}

export function parseStandardCrossReferenceTsv(text, filter = {}) {
  if (typeof text !== 'string') return [];
  const results = [];
  const wantedBook = filter.book || null;
  const wantedChapter = filter.chapter == null ? null : Number(filter.chapter);
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (wantedBook || wantedChapter !== null) {
      const firstTab = line.indexOf('\t');
      const secondTab = line.indexOf('\t', firstTab + 1);
      if (firstTab < 0 || secondTab < 0) continue;
      const sourceBookText = line.slice(0, firstTab).trim().toLowerCase().replace(/\./g, '');
      const sourceBook = BOOK_ALIASES.get(sourceBookText) || BOOK_NAMES.find(name => name.toLowerCase() === sourceBookText);
      const sourceChapter = Number(line.slice(firstTab + 1, secondTab));
      if ((wantedBook && sourceBook !== wantedBook) || (wantedChapter !== null && sourceChapter !== wantedChapter)) continue;
    }
    const row = parseRow(line, index);
    if (row) results.push(row);
  }
  return results;
}

export function getStandardCrossReferences(rows, { book, chapter, verse } = {}) {
  return (Array.isArray(rows) ? rows : []).filter(row =>
    row.book === book && Number(row.chapter) === Number(chapter) &&
    (verse == null || Number(row.verse) === Number(verse))
  );
}

const cache = new Map();
export async function loadStandardCrossReferences(translation = 'BSB', options = {}) {
  const code = String(translation).toUpperCase();
  const filename = FILES[code];
  if (!filename) throw new Error('Standard cross-references are not available for ' + code + '.');
  const fetcher = options.fetcher || globalThis.fetch;
  if (typeof fetcher !== 'function') throw new Error('Fetch is not available in this browser.');
  if (!cache.has(code)) {
    const request = fetcher(RAW_BASE + filename, { headers: { Accept: 'text/tab-separated-values' } })
      .then(async response => {
        if (!response || !response.ok) throw new Error('Cross-reference source returned HTTP ' + (response ? response.status : 'unknown') + '.');
        return response.text();
      })
      .catch(error => { cache.delete(code); throw error; });
    cache.set(code, request);
  }
  const rawText = await cache.get(code);
  if (options.signal && options.signal.aborted) throw new Error('Cross-reference request was cancelled.');
  return parseStandardCrossReferenceTsv(rawText, { book: options.book, chapter: options.chapter });
}
