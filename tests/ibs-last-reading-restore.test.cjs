const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function initAppSource() {
  const start = html.indexOf('async function initApp()');
  assert.notEqual(start, -1, 'initApp must exist');
  const end = html.indexOf('// UI Control Event Wiring', start);
  assert.notEqual(end, -1, 'initApp startup section must be identifiable');
  return html.slice(start, end);
}

test('Bible Reader restores the last-read passage before considering the active-study fallback', () => {
  const source = initAppSource();
  assert.match(
    source,
    /const hasLastReading = restoreLastReading\(\);\s*if \(!hasLastReading\) restoreLastActiveStudy\(\);/,
    'a valid saved reading must not be overwritten by the last-active-study pointer'
  );
});

test('last-reading restoration validates the saved canonical book and chapter and restores translation', () => {
  const start = html.indexOf('function restoreLastReading()');
  const end = html.indexOf('function saveLastReading()', start);
  assert.ok(start >= 0 && end > start, 'last-reading restore function must exist');
  const source = html.slice(start, end);
  assert.match(source, /BIBLE_CANON\.find/);
  assert.match(source, /chapter < 1 \|\| chapter > Number\(bookInfo\.chapters\)/);
  assert.match(source, /saved\.translation/);
  assert.match(source, /translationSelect\.value = appState\.currentTranslation/);
});
