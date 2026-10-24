const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFunction(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'expected source between ' + startMarker + ' and ' + endMarker);
  return html.slice(start, end).trim();
}

function loadSearchHelpers() {
  const canonStart = html.indexOf('    const BIBLE_CANON = [');
  const helpersEnd = html.indexOf('    // Free Use Bible API identifiers', canonStart);
  assert.ok(canonStart >= 0 && helpersEnd > canonStart, 'canonical book list and search helpers should be present');
  const source = html.slice(canonStart, helpersEnd);
  return vm.runInNewContext(source + '\n({ BIBLE_CANON, BIBLE_SEARCH_PAGE_SIZE, parseSearchReference, buildBibleSearchUrl, normalizeCanonicalBibleSearchPayload })', {
    URLSearchParams
  });
}

test('search reference parser accepts IBS canonical books and rejects apocryphal books', () => {
  const { parseSearchReference } = loadSearchHelpers();

  assert.deepEqual(
    JSON.parse(JSON.stringify(parseSearchReference('1 Corinthians 7:1'))),
    { book: '1 Corinthians', chapter: 7, verse: 1 }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(parseSearchReference('Psalm 23:1'))),
    { book: 'Psalms', chapter: 23, verse: 1 }
  );
  assert.equal(parseSearchReference('Sirach 13:23'), null);
  assert.equal(parseSearchReference('Tobit 4:7'), null);
  assert.equal(parseSearchReference('Romans 99:1'), null);
  assert.equal(parseSearchReference('John 3:0'), null);
});

test('search URL restricts the API to Old and New Testament and supports paging', () => {
  const { buildBibleSearchUrl, BIBLE_SEARCH_PAGE_SIZE } = loadSearchHelpers();

  const url = new URL(buildBibleSearchUrl('stumble', 'KJV', 50));
  assert.equal(url.searchParams.get('q'), 'stumble');
  assert.equal(url.searchParams.get('translation'), 'kjv');
  assert.equal(url.searchParams.get('testament'), 'OT,NT');
  assert.equal(Number(url.searchParams.get('limit')), BIBLE_SEARCH_PAGE_SIZE);
  assert.equal(Number(url.searchParams.get('offset')), 50);
  assert.equal(url.origin, 'https://bible-api.dws-cloud.com');
});

test('search response normalization removes non-canonical results and invalid references', () => {
  const { normalizeCanonicalBibleSearchPayload } = loadSearchHelpers();
  const normalized = normalizeCanonicalBibleSearchPayload({
    total: 4,
    results: [
      { reference: 'John 3:16', text: 'For God so loved the world.' },
      { reference: 'Sirach 13:23', text: 'Apocryphal result must not be shown.' },
      { reference: '1 Peter 2:8', text: 'A stone of stumbling.' },
      { reference: 'Romans 99:1', text: 'Invalid chapter must not be shown.' }
    ]
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(normalized.results.map(result => result.reference))),
    ['John 3:16', '1 Peter 2:8']
  );
  assert.equal(normalized.rawCount, 4);
  assert.equal(normalized.total, 4);
  assert.equal(normalized.results.some(result => /Sirach|Tobit|Wisdom/i.test(result.reference)), false);
});

test('search normalizer accepts documented API result shapes and total-capped metadata', () => {
  const { normalizeCanonicalBibleSearchPayload } = loadSearchHelpers();
  const normalized = normalizeCanonicalBibleSearchPayload({
    total: 1000,
    total_capped: true,
    verses: [{ reference: 'Genesis 1:1', text: 'In the beginning.' }]
  });
  assert.equal(normalized.results.length, 1);
  assert.equal(normalized.total, 1000);
  assert.equal(normalized.totalCapped, true);
});

test('search results update while typing and offer pagination for larger result sets', () => {
  assert.match(html, /id="bibleSearchLoadMoreBtn"/);
  assert.match(html, /id="bibleSearchInput"[^>]*type="search"/);
  assert.match(html, /bibleSearchInput?.addEventListener('input', () => scheduleBibleSearch(false))/);
  assert.match(html, /bibleSearchTranslation?.addEventListener('change', () => scheduleBibleSearch(true))/);
  assert.match(html, /bibleSearchLoadMoreBtn?.addEventListener('click', () => performBibleSearch({ append: true }))/);
  assert.ok(html.includes('bibleSearchRequestId += 1; // Ignore responses for earlier queries while the user continues typing'));
  assert.match(html, /setTimeout(() => {s*bibleSearchDebounceTimer = null;s*performBibleSearch();s*}, immediate ? 0 : 300)/);
  assert.match(html, /Search updates as you type and includes only the 66 books in the IBS canon/);
});
