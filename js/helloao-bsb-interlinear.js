(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HelloaoBsbInterlinear = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeStrongs(value) {
    const match = String(value || '').trim().toUpperCase().match(/^([HG])(\\d{1,5})[A-Z]?$/);
    return match ? match[1] + match[2].padStart(4, '0') : null;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
  }

  function mapVerseWordsToAnnotations(verseText, words) {
    const source = String(verseText || '');
    if (!source || !Array.isArray(words)) return [];

    const orderedWords = words.slice().sort((a, b) =>
      (Number(a && a.bsbPos) || Number.MAX_SAFE_INTEGER) -
        (Number(b && b.bsbPos) || Number.MAX_SAFE_INTEGER) ||
      (Number(a && a.pos) || Number.MAX_SAFE_INTEGER) -
        (Number(b && b.pos) || Number.MAX_SAFE_INTEGER)
    );

    const annotations = [];
    let cursor = 0;

    for (const word of orderedWords) {
      const strongs = normalizeStrongs(word && word.strongs);
      const gloss = String(word && word.gloss || '').trim().replace(/\\s+/g, ' ');
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
        start,
        end,
        strongs: [strongs],
        originalText: String(word.text || ''),
        transliteration: String(word.transliteration || ''),
        parsing: String(word.parsing || ''),
        parsingFull: String(word.parsingFull || ''),
        language: String(word.language || ''),
        gloss,
        bsbPos: Number(word.bsbPos) || null,
        originalPos: Number(word.pos) || null
      });
      cursor = end;
    }

    return annotations;
  }

  function mapChapterToAnnotations(verseTexts, chapterContent) {
    const texts = Array.isArray(verseTexts) ? verseTexts : [];
    const entries = Array.isArray(chapterContent) ? chapterContent : [];
    const textByVerse = new Map(texts.map(item => [Number(item.number), String(item.text || '')]));
    const result = Object.create(null);

    for (const entry of entries) {
      const verseNumber = Number(entry && entry.verse);
      const verseText = textByVerse.get(verseNumber);
      if (!Number.isInteger(verseNumber) || !verseText || !Array.isArray(entry.words)) continue;
      result[String(verseNumber)] = mapVerseWordsToAnnotations(verseText, entry.words);
    }

    return result;
  }

  return Object.freeze({ normalizeStrongs, mapVerseWordsToAnnotations, mapChapterToAnnotations });
});
