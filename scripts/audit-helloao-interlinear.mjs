#!/usr/bin/env node
/**
 * Read-only spot audit of the published HelloAO BSB interlinear chapter payloads.
 *
 * Run: node scripts/audit-helloao-interlinear.mjs
 * Optional: HELLOAO_API_BASE=https://bible.helloao.org/api node ...
 *
 * This reports structural coverage only. It does not infer dictionary lemmas,
 * validate Strong's-to-lexicon mappings, or persist downloaded Bible content.
 */

const API_BASE = (process.env.HELLOAO_API_BASE || 'https://bible.helloao.org/api').replace(/\/$/, '');
const PASSAGES = [
  ['GEN', 1, 'Hebrew sample'],
  ['DAN', 2, 'Aramaic sample'],
  ['EZR', 4, 'Biblical Aramaic sample'],
  ['EZR', 5, 'Biblical Aramaic sample'],
  ['EZR', 6, 'Biblical Aramaic sample'],
  ['EZR', 7, 'Biblical Aramaic sample'],
  ['MAT', 1, 'Greek sample'],
  ['JHN', 1, 'Greek sample']
];
const REQUIRED_FIELDS = [
  'pos', 'bsbPos', 'language', 'text', 'transliteration',
  'parsing', 'parsingFull', 'strongs', 'gloss'
];
const LANGUAGES = ['hebrew', 'aramaic', 'greek'];

function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

async function fetchChapter(book, chapter) {
  const url = `${API_BASE}/d/bsb-interlinear/${book}/${chapter}.json`;
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

function extractWords(payload, label) {
  // HelloAO DatasetBookChapter nests verse records under chapter.content.
  const verses = payload && payload.chapter && payload.chapter.content;
  if (!Array.isArray(verses)) {
    const topLevelKeys = payload && typeof payload === 'object' ? Object.keys(payload) : [];
    const chapterKeys = payload && payload.chapter && typeof payload.chapter === 'object'
      ? Object.keys(payload.chapter)
      : [];
    throw new Error(
      `${label}: expected chapter.content array; top-level keys=[${topLevelKeys.join(', ')}], ` +
      `chapter keys=[${chapterKeys.join(', ')}]`
    );
  }
  const words = [];
  for (const verse of verses) {
    if (verse && Array.isArray(verse.words)) {
      for (const word of verse.words) words.push(word);
    }
  }
  if (!words.length) throw new Error(`${label}: chapter.content contained no interlinear word records`);
  return words;
}

function summarize(words) {
  const byLanguage = Object.fromEntries(LANGUAGES.map(language => [language, 0]));
  let unknownLanguageCount = 0;
  const fieldStats = Object.fromEntries(REQUIRED_FIELDS.map(field => [field, { present: 0, nullOrMissing: 0 }]));
  const strongsPrefixes = { H: 0, G: 0, other: 0 };
  const lemmaField = { present: 0, nullOrMissing: 0 };
  for (const word of words) {
    if (LANGUAGES.includes(word.language)) byLanguage[word.language] += 1;
    else unknownLanguageCount += 1;
    if (isPresent(word.lemma) || isPresent(word.lemmaId)) lemmaField.present += 1;
    else lemmaField.nullOrMissing += 1;
    for (const field of REQUIRED_FIELDS) {
      if (isPresent(word[field])) fieldStats[field].present += 1;
      else fieldStats[field].nullOrMissing += 1;
    }
    const strongs = String(word.strongs || '').toUpperCase();
    if (strongs.startsWith('H')) strongsPrefixes.H += 1;
    else if (strongs.startsWith('G')) strongsPrefixes.G += 1;
    else strongsPrefixes.other += 1;
  }
  return { totalWords: words.length, byLanguage, unknownLanguageCount, fieldStats, lemmaField, strongsPrefixes };
}

const results = [];
const failures = [];
for (const [book, chapter, sampleType] of PASSAGES) {
  const label = `${book} ${chapter}`;
  try {
    const payload = await fetchChapter(book, chapter);
    const words = extractWords(payload, label);
    results.push({
      passage: label,
      sampleType,
      retrievedAt: new Date().toISOString(),
      dataset: 'bsb-interlinear',
      book: payload.book || book,
      chapter: payload.chapter || chapter,
      wordStats: summarize(words)
    });
  } catch (error) {
    failures.push({ passage: label, error: error instanceof Error ? error.message : String(error) });
  }
}

const report = {
  audit: 'HelloAO BSB interlinear live-payload structural spot check',
  retrievedAt: new Date().toISOString(),
  apiBase: API_BASE,
  passagesRequested: PASSAGES.map(([book, chapter]) => `${book} ${chapter}`),
  passagesSucceeded: results.length,
  passagesFailed: failures.length,
  results,
  failures,
  interpretation: [
    'Counts describe only the retrieved sample payloads.',
    'language is counted from the explicit token field; Strong’s prefixes are reported separately and are not used to infer language.',
    'A missing lemma field is expected under the currently documented InterlinearWord schema.',
    'No dictionary lemma or Strong’s-to-BDB mapping is inferred or verified by this audit.'
  ]
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
if (failures.length) process.exitCode = 1;
