const VALID_TAGS = new Set(['key-word', 'repeated-idea', 'contrast', 'command', 'promise', 'question']);

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(tag => VALID_TAGS.has(tag)))];
}

/**
 * Build structured observations for one passage from whole-verse and
 * phrase-level Scripture markup. Freeform notes are deliberately not parsed.
 */
export function listPassageObservations({
  passageKey,
  verses = [],
  scriptureMarkup = {},
  wordMarkup = {}
} = {}) {
  if (typeof passageKey !== 'string' || !passageKey || !Array.isArray(verses)) return [];
  const verseTexts = new Map(
    verses.filter(verse => verse && Number.isInteger(verse.number) && typeof verse.text === 'string')
      .map(verse => [verse.number, verse.text])
  );
  const wholeVerseMarks = scriptureMarkup && typeof scriptureMarkup === 'object'
    ? scriptureMarkup[passageKey] || {} : {};
  const phraseMarks = wordMarkup && typeof wordMarkup === 'object'
    ? wordMarkup[passageKey] || {} : {};
  const result = [];

  for (const [verseKey, rawTags] of Object.entries(wholeVerseMarks)) {
    const verse = Number(verseKey);
    const text = verseTexts.get(verse);
    const tags = normalizeTags(rawTags);
    if (!Number.isInteger(verse) || verse < 1 || !text || !tags.length) continue;
    result.push({ id: 'verse:' + verse, kind: 'verse', verse, text, tags, start: 0, end: text.length });
  }

  for (const [verseKey, ranges] of Object.entries(phraseMarks)) {
    const verse = Number(verseKey);
    const verseText = verseTexts.get(verse);
    if (!Number.isInteger(verse) || verse < 1 || !verseText || !Array.isArray(ranges)) continue;
    for (let index = 0; index < ranges.length; index++) {
      const range = ranges[index];
      if (!range || !Number.isInteger(range.start) || !Number.isInteger(range.end) ||
          range.start < 0 || range.end <= range.start || range.end > verseText.length) continue;
      const tags = normalizeTags(range.tags);
      if (!tags.length) continue;
      result.push({
        id: 'phrase:' + verse + ':' + range.start + ':' + range.end + ':' + index,
        kind: 'phrase',
        verse,
        text: verseText.slice(range.start, range.end),
        tags,
        start: range.start,
        end: range.end
      });
    }
  }

  return result.sort((a, b) => a.verse - b.verse || a.start - b.start || a.end - b.end || a.kind.localeCompare(b.kind));
}
