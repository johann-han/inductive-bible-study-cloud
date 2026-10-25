const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('My Saved Studies button is explicitly non-submitting and opens the study library', () => {
  assert.match(html, /<button id="openStudyLibraryBtn" type="button"[^>]*>My Saved Studies<\\/button>/);
  assert.match(html, /if \(openButton && modal\) openButton\.addEventListener\('click', event => \{\s*event\.preventDefault\(\);\s*saveActiveStudyNote\(\);\s*renderStudyLibrary\(\);\s*modal\.classList\.remove\('hidden'\);/);
});
