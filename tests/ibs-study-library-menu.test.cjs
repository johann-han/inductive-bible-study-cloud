const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('My Saved Studies lives in the reader menu, not the active notes header', () => {
  const menuStart = html.indexOf('<div id="headerControlsPanel"');
  const menuEnd = html.indexOf('</div>', menuStart);
  const menu = html.slice(menuStart, menuEnd);
  assert.match(menu, /<button id="openStudyLibraryBtn" type="button"[^>]*>My Saved Studies<\/button>/);
  const notesHeaderStart = html.indexOf('<div class="p-3 bg-white border-b border-slate-200 flex items-center justify-between">');
  const notesHeaderEnd = html.indexOf('</div>', notesHeaderStart);
  assert.doesNotMatch(html.slice(notesHeaderStart, notesHeaderEnd), /openStudyLibraryBtn/);
  assert.match(html, /id="studyLibraryModal" class="hidden fixed inset-0 z-\[100\]/);
});
