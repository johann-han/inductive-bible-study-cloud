'use strict';

const REQUIRED_FIELDS = ['pos','bsbPos','language','text','transliteration','parsing','parsingFull','strongs','gloss'];
const LANGUAGES = ['hebrew','aramaic','greek'];
const TRACKED_LANGUAGES = [...LANGUAGES,'unknown'];
const isPresent = value => value !== undefined && value !== null && value !== '';

function createStats() {
  return {
    chaptersSucceeded: 0, verses: 0, totalWords: 0,
    byLanguage: Object.fromEntries(LANGUAGES.map(x => [x, 0])),
    unknownLanguageCount: 0,
    fieldStats: Object.fromEntries(REQUIRED_FIELDS.map(x => [x, {present:0,nullOrMissing:0}])),
    missingFieldsByLanguage: Object.fromEntries(TRACKED_LANGUAGES.map(language => [
      language, Object.fromEntries(REQUIRED_FIELDS.map(field => [field,0]))
    ])),
    lemmaField: {present:0,nullOrMissing:0},
    strongsPrefixes: {H:0,G:0,other:0},
    strongsByLanguage: Object.fromEntries(TRACKED_LANGUAGES.map(x => [x,{H:0,G:0,other:0}])),
    strongsOtherBreakdown: Object.fromEntries(TRACKED_LANGUAGES.map(x => [x,{missing:0,nonstandard:0}])),
    duplicatePosWithinVerse: 0, duplicateBsbPosWithinVerse: 0, invalidWordRecords: 0
  };
}

function extractChapterWords(payload, label = 'chapter') {
  const verses = payload && payload.chapter && payload.chapter.content;
  if (!Array.isArray(verses)) {
    const top = payload && typeof payload === 'object' ? Object.keys(payload) : [];
    const nested = payload && payload.chapter && typeof payload.chapter === 'object' ? Object.keys(payload.chapter) : [];
    throw new Error(label + ': expected chapter.content array; top-level keys=[' + top.join(', ') + '], chapter keys=[' + nested.join(', ') + ']');
  }
  const words = [];
  for (const verse of verses) {
    if (!verse || !Array.isArray(verse.words)) throw new Error(label + ': verse record is missing its words array');
    for (const word of verse.words) words.push({word, verseNumber:verse.verse});
  }
  if (!words.length) throw new Error(label + ': chapter.content contained no interlinear word records');
  return {verses,words};
}

function addChapterToStats(stats, payload, label = 'chapter') {
  const {verses,words} = extractChapterWords(payload,label);
  stats.chaptersSucceeded += 1;
  stats.verses += verses.length;
  for (const item of words) {
    const word = item.word;
    if (!word || typeof word !== 'object' || Array.isArray(word)) { stats.invalidWordRecords += 1; continue; }
    stats.totalWords += 1;
    const language = LANGUAGES.includes(word.language) ? word.language : 'unknown';
    if (language === 'unknown') stats.unknownLanguageCount += 1;
    else stats.byLanguage[language] += 1;
    if (isPresent(word.lemma) || isPresent(word.lemmaId)) stats.lemmaField.present += 1;
    else stats.lemmaField.nullOrMissing += 1;
    for (const field of REQUIRED_FIELDS) {
      if (isPresent(word[field])) stats.fieldStats[field].present += 1;
      else {
        stats.fieldStats[field].nullOrMissing += 1;
        stats.missingFieldsByLanguage[language][field] += 1;
      }
    }
    const strongsPresent = isPresent(word.strongs);
    const strongs = strongsPresent ? String(word.strongs).toUpperCase().trim() : '';
    const prefix = strongs.startsWith('H') ? 'H' : strongs.startsWith('G') ? 'G' : 'other';
    stats.strongsPrefixes[prefix] += 1;
    stats.strongsByLanguage[language][prefix] += 1;
    if (prefix === 'other') {
      const status = strongsPresent ? 'nonstandard' : 'missing';
      stats.strongsOtherBreakdown[language][status] += 1;
    }
  }
  for (const verse of verses) {
    for (const pair of [['pos','duplicatePosWithinVerse'],['bsbPos','duplicateBsbPosWithinVerse']]) {
      const seen = new Set();
      for (const word of verse.words) {
        if (!word || !isPresent(word[pair[0]])) continue;
        const value = String(word[pair[0]]);
        if (seen.has(value)) stats[pair[1]] += 1;
        else seen.add(value);
      }
    }
  }
  return stats;
}

function buildChapterTargets(books) {
  if (!Array.isArray(books) || books.length === 0) throw new Error('HelloAO books response did not contain a non-empty books array');
  const targets = [];
  for (const book of books) {
    if (!book || typeof book.id !== 'string' || !Number.isInteger(book.numberOfChapters)) {
      throw new Error('HelloAO books response contains a book without an id or numberOfChapters');
    }
    const first = Number.isInteger(book.firstChapterNumber) ? book.firstChapterNumber : 1;
    const last = Number.isInteger(book.lastChapterNumber) ? book.lastChapterNumber : first + book.numberOfChapters - 1;
    if (last - first + 1 !== book.numberOfChapters) {
      throw new Error('Chapter range mismatch for ' + book.id + ': metadata says ' + book.numberOfChapters + ', range is ' + first + '-' + last);
    }
    for (let chapter=first; chapter<=last; chapter++) targets.push({book:book.id,chapter});
  }
  return targets;
}

module.exports = {LANGUAGES,REQUIRED_FIELDS,addChapterToStats,buildChapterTargets,createStats,extractChapterWords};
