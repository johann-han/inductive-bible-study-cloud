const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('related passages card is compact on phones while its list remains toggleable', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<section id="studyRelatedPassagesSection"[^>]*>/);
  assert.match(html, /function isTouchWorkspaceLayout\(\)[\s\S]*?screenWidth <= 1024[\s\S]*?maxTouchPoints[\s\S]*?classList\.toggle\('touch-workspace-layout', useMobileLayout\)/);
  assert.match(html, /touchDeviceWithWideViewport = hasTouch && screenWidth > 0 && screenWidth <= 1024/);
  assert.match(html, /document\.documentElement\.classList\.toggle\('touch-workspace-layout', useMobileLayout\)/);
  assert.match(html, /@media \(pointer: coarse\) and \(hover: none\)[\s\S]*?#studyRelatedPassageStatus\s*\{\s*display: none !important;/);
  assert.ok(html.includes('isTouchWorkspaceLayout()'));
  assert.match(html, /html\.touch-workspace-layout #readerWorkspace main\.flex-1\.flex\.flex-col\.overflow-hidden\s*\{\s*flex-direction: column !important;/);
  assert.match(html, /html\.touch-workspace-layout #studyRelatedPassagesSection\s*\{\s*padding: \.5rem !important; gap: \.35rem !important;/);
  assert.match(html, /html\.touch-workspace-layout #headerControlsPanel\.is-menu-closed \{ display: none !important; \}/);
  assert.match(html, /if \(notesButton && isTouchWorkspaceLayout\(\)\)/);
  assert.match(html, /function setAIDrawerOpen\(open\)[\s\S]*?const isMobileLayout = isTouchWorkspaceLayout\(\);/);
  assert.match(html, /html, body\s*\{\s*max-width: 100%;\s*overflow-x: hidden;\s*overflow-x: clip;/);
  assert.match(html, /#workspacePanel\.workspace-mobile-closed\s*\{\s*transform: translateX\(100%\) !important;/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?#studyRelatedPassagesSection\s*\{\s*padding: \.5rem !important;\s*gap: \.35rem !important;/);
  assert.match(html, /#studyRelatedPassagesSection > div:first-child > div:first-child > p:nth-child\(2\),\s*#studyRelatedPassageStatus\s*\{\s*display: none !important;/);
  assert.match(html, /#studyRelatedPassageList\.is-mobile-collapsed\s*\{\s*display: none;\s*\}/);
  assert.match(html, /id="toggleStudyRelatedPassagesBtn"[^>]*aria-controls="studyRelatedPassageList"[^>]*aria-expanded="false"/);
  assert.match(html, /id="openStudyRelatedPassagesBtn"/);
});
