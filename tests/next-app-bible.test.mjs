import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIBLE_BOOKS,
  fetchBibleChapter,
  LAST_READING_STORAGE_KEY,
  readSavedPassage,
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
      requestedUrl = url;
      return response({ chapter: { content: [
        { type: 'heading', text: 'Creation' },
        { type: 'verse', number: 2, text: 'And the earth was without form.' },
        { type: 'verse', number: 1, text: 'In the beginning God created.' }
      ] } });
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
      requestedUrl = url;
      return response({ chapter: { content: [
        { type: 'verse', number: 1, text: 'This is the BSB text.' }
      ] } });
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
