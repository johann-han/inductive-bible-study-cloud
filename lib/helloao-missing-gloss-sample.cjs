'use strict';

const crypto = require('node:crypto');
const {extractChapterWords,LANGUAGES} = require('./helloao-interlinear-audit.cjs');

const SAMPLE_LIMIT_PER_BOOK_LANGUAGE = 12;
const SAMPLE_FIELDS = ['pos','bsbPos','language','text','transliteration','parsing','parsingFull','strongs','gloss'];

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

function stableRank(record) {
  return crypto.createHash('sha256').update([
    record.book,record.chapter,record.verse,record.pos,record.bsbPos,record.text
  ].map(value => String(value ?? '')).join('|')).digest('hex');
}

function collectMissingGlossRecords(payload, book, chapter) {
  const {words} = extractChapterWords(payload, book + ' ' + chapter);
  const records = [];
  for (const {word,verseNumber} of words) {
    if (!word || typeof word !== 'object' || Array.isArray(word) || !isMissing(word.gloss)) continue;
    if (!LANGUAGES.includes(word.language)) continue;
    const record = {book,chapter,verse:verseNumber};
    for (const field of SAMPLE_FIELDS) record[field] = word[field] ?? null;
    records.push(record);
  }
  return records;
}

// Return every source record for one explicit language without sampling,
// normalising or inferring any field. This enables complete token-level audits.
function selectMissingGlossRecordsByLanguage(records, language) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (!LANGUAGES.includes(language)) throw new RangeError('language must be one of: ' + LANGUAGES.join(', '));
  return records.filter(record => record && record.language === language);
}

function createMissingGlossSample(records, limit = SAMPLE_LIMIT_PER_BOOK_LANGUAGE) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  const counts = Object.fromEntries(LANGUAGES.map(language => [language,0]));
  const groups = new Map();
  for (const record of records) {
    if (!LANGUAGES.includes(record.language)) continue;
    counts[record.language]++;
    const key = record.book + ':' + record.language;
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(record);
  }
  const samples = [];
  for (const group of groups.values()) {
    group.sort((a,b) => stableRank(a).localeCompare(stableRank(b)));
    samples.push(...group.slice(0,limit));
  }
  samples.sort((a,b) => a.book.localeCompare(b.book) || a.language.localeCompare(b.language) ||
    Number(a.chapter)-Number(b.chapter) || Number(a.verse)-Number(b.verse) || String(a.pos).localeCompare(String(b.pos)));
  return {
    method: 'Deterministic SHA-256-ranked sample, capped per book and explicit language',
    limitPerBookLanguage: limit,
    missingGlossCountsByLanguage: counts,
    sampleCountsByLanguage: Object.fromEntries(LANGUAGES.map(language => [
      language,samples.filter(record => record.language === language).length
    ])),
    records: samples
  };
}

function summarizeMissingGlossRecords(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const byLanguage = Object.fromEntries(LANGUAGES.map(language => [language,{
    records:0,missingStrong:0,withStrong:0
  }]));
  const greekStrongGroups = new Map();
  const greekParsingCounts = new Map();

  for (const record of records) {
    const language = record && record.language;
    if (!LANGUAGES.includes(language)) continue;
    byLanguage[language].records++;
    const strongs = typeof record.strongs === 'string' ? record.strongs.trim().toUpperCase() : '';
    if (strongs) byLanguage[language].withStrong++;
    else byLanguage[language].missingStrong++;

    if (language !== 'greek') continue;
    const parsing = record.parsingFull || '(missing parsingFull)';
    greekParsingCounts.set(parsing,(greekParsingCounts.get(parsing)||0)+1);
    const key = strongs || '(missing Strong\'s)';
    if (!greekStrongGroups.has(key)) greekStrongGroups.set(key,{
      strongs:key,occurrences:0,parsingFullCounts:{},books:new Set(),sampleTexts:new Set()
    });
    const group = greekStrongGroups.get(key);
    group.occurrences++;
    group.parsingFullCounts[parsing]=(group.parsingFullCounts[parsing]||0)+1;
    if (record.book) group.books.add(record.book);
    if (record.text && group.sampleTexts.size < 8) group.sampleTexts.add(record.text);
  }

  const greekStrongEntries = [...greekStrongGroups.values()].map(group => ({
    strongs:group.strongs,
    occurrences:group.occurrences,
    bookCount:group.books.size,
    books:[...group.books].sort(),
    parsingFullCounts:Object.fromEntries(Object.entries(group.parsingFullCounts).sort((a,b)=>b[1]-a[1])),
    sampleTexts:[...group.sampleTexts]
  })).sort((a,b)=>b.occurrences-a.occurrences || a.strongs.localeCompare(b.strongs));

  const isCoreFunctionWord = parsing =>
    parsing.startsWith('Article') ||
    parsing === 'Conjunction' ||
    parsing === 'Adverb' ||
    parsing === 'Preposition';
  const beyondCoreParsingCounts = new Map();
  const beyondCoreStrongEntries = greekStrongEntries.map(entry => {
    const parsingFullCounts = Object.fromEntries(
      Object.entries(entry.parsingFullCounts).filter(([parsing]) => !isCoreFunctionWord(parsing))
    );
    const occurrences = Object.values(parsingFullCounts).reduce((sum,count) => sum + count,0);
    for (const [parsing,count] of Object.entries(parsingFullCounts)) {
      beyondCoreParsingCounts.set(parsing,(beyondCoreParsingCounts.get(parsing)||0)+count);
    }
    return {...entry,occurrences,parsingFullCounts};
  }).filter(entry => entry.occurrences > 0)
    .sort((a,b) => b.occurrences-a.occurrences || a.strongs.localeCompare(b.strongs));

  const greekBeyondCoreFunctionWords = {
    definition:'Greek missing-gloss records whose parsingFull is not Article, Conjunction, Adverb or Preposition',
    totalRecords:beyondCoreStrongEntries.reduce((sum,entry) => sum + entry.occurrences,0),
    parsingFullCounts:Object.fromEntries([...beyondCoreParsingCounts.entries()].sort((a,b)=>b[1]-a[1])),
    strongEntries:beyondCoreStrongEntries
  };

  return {
    method:'Exact aggregation of all successfully retrieved missing-gloss records; no source fields inferred',
    totalRecords:records.length,
    byLanguage,
    greekParsingFullCounts:Object.fromEntries([...greekParsingCounts.entries()].sort((a,b)=>b[1]-a[1])),
    greekStrongEntries,
    greekBeyondCoreFunctionWords
  };
}

module.exports = {
  SAMPLE_LIMIT_PER_BOOK_LANGUAGE,
  collectMissingGlossRecords,
  selectMissingGlossRecordsByLanguage,
  createMissingGlossSample,
  summarizeMissingGlossRecords
};
