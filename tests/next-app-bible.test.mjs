import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIBLE_BOOKS,
  fetchBibleChapter,
  fetchStrongsLexicon,
  listPreviewDraftEntries,
  LAST_READING_STORAGE_KEY,
  PREVIEW_DRAFTS_STORAGE_KEY,
  readPreviewDrafts,
  readSavedPassage,
  writePreviewDrafts,
  writeSavedPassage
} from '../next-app/src/lib/bible.mjs';

function response(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload };
}

test('Bible canon contains all 66 books with correct opening and closing books', () => {
  assert.equal(BIBLE_BOOKS.length, 66);
  assert.equal(BIBLE_BOOKS[0].name, 'Genesis');
  assert.equal(BIBLE_BOOKS[0].chapters, 50);
  assert.equal(BIBLE_BOOKS[65].name, 'Revelation');
  assert.equal(BIBLE_BOOKS[65].chapters, 22);
});

test('KJV loads the complete returned chapter from the existing HelloAO source', async () => {
  let requestedUrl = '';
  const result = await fetchBibleChapter('Genesis', 1, 'KJV', {
    fetcher: async (url) => {
      if (url.endsWith('/1.simple.json')) {
        requestedUrl = url;
        return response({ chapter: { content: [
          { type: 'heading', text: 'Creation' },
          { type: 'verse', number: 2, text: 'And the earth was without form.' },
          { type: 'verse', number: 1, text: 'In the beginning God created.' }
        ] } });
      }
      if (url.endsWith('/1.words.simple.json')) return response({ verses: {} });
      throw new Error('Unexpected source URL: ' + url);
    }
  });
  assert.match(requestedUrl, /eng_kjv\/GEN\/1\.simple\.json$/);
  assert.equal(result.source, 'Free Use Bible API');
  assert.deepEqual(result.verses.map((verse) => verse.number), [1, 2]);
  assert.equal(result.verses.length, 2);
});

test('BSB uses its dedicated HelloAO translation source', async () => {
  let requestedUrl = '';
  const result = await fetchBibleChapter('Matthew', 1, 'BSB', {
    fetcher: async (url) => {
      if (url.endsWith('/1.simple.json')) {
        requestedUrl = url;
        return response({ chapter: { content: [
          { type: 'verse', number: 1, text: 'This is the BSB text.' }
        ] } });
      }
      if (url.includes('bsb-interlinear')) return response({ chapter: { content: [] } });
      throw new Error('Unexpected source URL: ' + url);
    }
  });
  assert.match(requestedUrl, /\/BSB\/MAT\/1\.simple\.json$/);
  assert.equal(result.translation, 'BSB');
});

test('BSB failure does not silently substitute another translation', async () => {
  const requested = [];
  await assert.rejects(
    fetchBibleChapter('Matthew', 1, 'BSB', {
      fetcher: async (url) => { requested.push(url); return response({}, false, 503); }
    }),
    /no other translation was substituted/
  );
  assert.equal(requested.length, 1);
  assert.match(requested[0], /\/BSB\/MAT\/1\.simple\.json$/);
});

test('KJV uses the existing bible-api fallback when the primary source is unavailable', async () => {
  const requested = [];
  const result = await fetchBibleChapter('John', 3, 'KJV', {
    fetcher: async (url) => {
      requested.push(url);
      if (requested.length === 1) return response({}, false, 502);
      return response({ verses: [{ verse: 16, text: '16 For God so loved the world.' }] });
    }
  });
  assert.equal(requested.length, 2);
  assert.match(requested[1], /bible-api\.com\/John%203\?translation=kjv/);
  assert.equal(result.source, 'bible-api.com · KJV fallback');
  assert.equal(result.verses[0].number, 16);
  assert.equal(result.verses[0].text, 'For God so loved the world.');
});

test('ASV, WEB and BBE use the existing translation-aware provider', async () => {
  for (const translation of ['ASV', 'WEB', 'BBE']) {
    let requestedUrl = '';
    const result = await fetchBibleChapter('Romans', 8, translation, {
      fetcher: async (url) => {
        requestedUrl = url;
        return response({ verses: [{ verse: 1, text: '1 There is therefore now no condemnation.' }] });
      }
    });
    assert.match(requestedUrl, new RegExp('translation=' + translation.toLowerCase()));
    assert.equal(result.translation, translation);
  }
});

test('invalid book and chapter requests are rejected before fetching', async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return response({}); };
  await assert.rejects(fetchBibleChapter('Unknown Book', 1, 'KJV', { fetcher }), /66-book Bible canon/);
  await assert.rejects(fetchBibleChapter('Genesis', 51, 'KJV', { fetcher }), /has 50 chapters/);
  assert.equal(calls, 0);
});

test('last-read passage uses and preserves the existing localStorage contract', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  assert.equal(writeSavedPassage({ book: 'Ephesians', chapter: 2, translation: 'BSB' }, storage), true);
  assert.equal(values.has(LAST_READING_STORAGE_KEY), true);
  assert.deepEqual(readSavedPassage(storage), { book: 'Ephesians', chapter: 2, translation: 'BSB' });
  assert.equal(writeSavedPassage({ book: 'Genesis', chapter: 51, translation: 'KJV' }, storage), false);
  values.set(LAST_READING_STORAGE_KEY, JSON.stringify({ book: 'Genesis', chapter: 999, translation: 'KJV' }));
  assert.equal(readSavedPassage(storage), null);
});


test('KJV word annotations retain only valid character offsets and real Strong’s ids', async () => {
  const result = await fetchBibleChapter('Genesis', 1, 'KJV', {
    fetcher: async (url) => {
      if (url.endsWith('/1.simple.json')) return response({ chapter: { content: [{ type: 'verse', number: 1, text: 'In the beginning God created.' }] } });
      if (url.endsWith('.words.simple.json')) return response({ verses: {
        '1': [
          { start: 7, end: 16, strongs: ['H7225'] },
          { start: -2, end: 4, strongs: ['H0430'] },
          { start: 17, end: 20, strongs: ['bogus'] },
          { start: 17, end: 20, strongs: ['H0430'] }
        ]
      } });
      throw new Error('Unexpected source URL: ' + url);
    }
  });
  assert.deepEqual(result.annotations['1'].map(item => [item.start, item.end, item.strongs[0]]), [
    [7, 16, 'H7225'], [17, 20, 'H0430']
  ]);
});

test('BSB word alignment follows source order and leaves unmatched glosses untagged', async () => {
  const result = await fetchBibleChapter('Genesis', 1, 'BSB', {
    fetcher: async (url) => {
      if (url.endsWith('/1.simple.json')) return response({ chapter: { content: [
        { type: 'verse', number: 1, text: 'In the beginning God created the heavens and the earth.' }
      ] } });
      if (url.includes('bsb-interlinear')) return response({ chapter: { content: [
        { verse: 1, words: [
          { bsbPos: 1, pos: 1, strongs: 'G1722', gloss: 'In', text: 'ἐν', transliteration: 'en', parsingFull: 'Preposition' },
          { bsbPos: 2, pos: 2, strongs: 'G3588', gloss: 'the', text: 'τῇ' },
          { bsbPos: 3, pos: 3, strongs: 'G746', gloss: 'beginning', text: 'ἀρχῇ' },
          { bsbPos: 4, pos: 4, strongs: 'G2316', gloss: 'God', text: 'θεός' },
          { bsbPos: 5, pos: 5, strongs: 'G99999', gloss: 'not-in-text', text: 'x' }
        ] }
      ] } });
      throw new Error('Unexpected source URL: ' + url);
    }
  });
  assert.deepEqual(result.annotations['1'].map(item => item.gloss), ['In', 'the', 'beginning', 'God']);
  assert.equal(result.annotations['1'][0].transliteration, 'en');
  assert.equal(result.annotations['1'][2].originalText, 'ἀρχῇ');
});

test('optional KJV annotation failure does not make valid chapter text unavailable', async () => {
  const result = await fetchBibleChapter('Genesis', 1, 'KJV', {
    fetcher: async (url) => {
      if (url.endsWith('/1.simple.json')) return response({ chapter: { content: [{ type: 'verse', number: 1, text: 'In the beginning.' }] } });
      return response({}, false, 503);
    }
  });
  assert.equal(result.verses.length, 1);
  assert.deepEqual(result.annotations, {});
});

test('Strong’s lexicon uses the published source and returns its supplied senses', async () => {
  let requestedUrl = '';
  const entry = await fetchStrongsLexicon('H7225', {
    fetcher: async (url) => {
      requestedUrl = url;
      return response({ entry: { id: 'H7225', senses: [
        { lemma: 'רֵאשִׁית', transliteration: 'reshith', partOfSpeech: 'N', gloss: 'beginning', definition: 'The first part or starting point.' },
        { gloss: 'first', definition: 'First in order or sequence.' }
      ] } });
    }
  });
  assert.match(requestedUrl, /stepbible-lexicon\/lexicon\/H7225\.json$/);
  assert.equal(entry.id, 'H7225');
  assert.equal(entry.senses.length, 2);
  assert.match(entry.source, /Tyndale House/);
});

test('missing Strong’s lexicon data is an error rather than an invented definition', async () => {
  await assert.rejects(
    fetchStrongsLexicon('G3056', { fetcher: async () => response({ entry: { senses: [] } }) }),
    /No verified lexicon entry/
  );
});


test('preview-only stage notes persist per passage without using the existing study-library key', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const drafts = {
    'Genesis|1': { observe: 'Repeated words are visible.', interpret: 'The passage opens with creation.', doctrine: 'God is the Creator.', apply: '', activeStage: 'doctrine' },
    'John|1': { observe: 'The Word is introduced.', interpret: '', doctrine: '', apply: '', activeStage: 'observe' }
  };
  assert.equal(writePreviewDrafts(drafts, storage), true);
  assert.equal(values.has(PREVIEW_DRAFTS_STORAGE_KEY), true);
  const restored = readPreviewDrafts(storage);
  assert.equal(restored['Genesis|1'].observe, 'Repeated words are visible.');
  assert.equal(restored['Genesis|1'].doctrine, 'God is the Creator.');
  assert.equal(restored['Genesis|1'].activeStage, 'doctrine');
  assert.equal(restored['John|1'].observe, 'The Word is introduced.');
});

test('preview draft restoration ignores malformed passages and non-text note values', () => {
  const values = new Map([[PREVIEW_DRAFTS_STORAGE_KEY, JSON.stringify({
    'Genesis|1': { observe: 'Valid note', interpret: 7, doctrine: null, apply: '' },
    'Genesis|51': { observe: 'Invalid chapter' },
    'Unknown|1': { observe: 'Unknown book' },
    'Matthew|1|2': { observe: 'Malformed key' }
  })]]);
  const restored = readPreviewDrafts({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  });
  assert.deepEqual(restored['Genesis|1'], { observe: 'Valid note', interpret: '', doctrine: '', apply: '', activeStage: 'observe' });
  assert.equal(restored['Genesis|51'], undefined);
  assert.equal(restored['Unknown|1'], undefined);
});

test('preview draft storage failures are reported rather than claimed as saved', () => {
  const storage = {
    getItem: () => null,
    setItem: () => { throw new Error('Storage quota exceeded'); }
  };
  assert.equal(writePreviewDrafts({ 'Genesis|1': { observe: 'A note', interpret: '', doctrine: '', apply: '' } }, storage), false);
});


test('preview study library lists only non-empty draft records with active stage and progress', () => {
  const entries = listPreviewDraftEntries({
    'John|1': { observe: 'The Word was with God.', interpret: 'John introduces the Word.', doctrine: '', apply: '', activeStage: 'interpret' },
    'Genesis|1': { observe: 'God created.', interpret: '', doctrine: 'God is Creator.', apply: '', activeStage: 'doctrine' },
    'Mark|1': { observe: '', interpret: '', doctrine: '', apply: '', activeStage: 'observe' },
    'Genesis|51': { observe: 'Invalid chapter', interpret: '', doctrine: '', apply: '', activeStage: 'observe' }
  });
  assert.deepEqual(entries.map(entry => entry.book + '|' + entry.chapter), ['Genesis|1', 'John|1']);
  assert.equal(entries[0].activeStage, 'doctrine');
  assert.equal(entries[0].stageCount, 2);
  assert.equal(entries[0].wordCount, 5);
  assert.match(entries[0].preview, /God is Creator/);
  assert.equal(entries[1].activeStage, 'interpret');
  assert.equal(entries[1].stageCount, 2);
});
