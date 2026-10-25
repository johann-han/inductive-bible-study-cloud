const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('related passages card is compact on phones while its list remains toggleable', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<section id="studyRelatedPassagesSection"[^>]*>/);
  const bootstrapStart = html.indexOf('// Desktop-site mode can report a viewport wider than the actual phone.');
  const bootstrapEnd = html.indexOf('</script>', bootstrapStart);
  const firstStyle = html.indexOf('<style>', bootstrapEnd);
  assert.ok(bootstrapStart >= 0 && bootstrapEnd > bootstrapStart && firstStyle > bootstrapEnd,
    'touch layout must be classified before the responsive CSS is parsed');
  const bootstrap = html.slice(bootstrapStart, bootstrapEnd);
  assert.match(bootstrap, /applyTouchWorkspaceLayout\(\);/);
  assert.match(bootstrap, /addEventListener\('resize', applyTouchWorkspaceLayout/);
  assert.match(bootstrap, /addEventListener\('orientationchange', applyTouchWorkspaceLayout/);
  assert.match(html, /function isTouchWorkspaceLayout\(\)[\s\S]*?screenWidth <= 1024[\s\S]*?classList\.toggle\('touch-workspace-layout', useMobileLayout\)/);
  assert.match(html, /function isTouchWorkspaceLayout\(\)[\s\S]*?maxTouchPoints/);
  assert.match(html, /touchDeviceWithWideViewport = hasTouch && screenWidth > 0 && screenWidth <= 1024/);
  assert.match(html, /document\.documentElement\.classList\.toggle\('touch-workspace-layout', useMobileLayout\)/);
  assert.match(html, /@media \(pointer: coarse\) and \(hover: none\)[\s\S]*?#studyRelatedPassageStatus\s*\{\s*display: none !important;/);
  assert.ok(html.includes('isTouchWorkspaceLayout()'));
  assert.match(html, /html\.touch-workspace-layout #readerWorkspace main\.flex-1\.flex\.flex-col\.overflow-hidden\s*\{\s*flex-direction: column !important;/);
  assert.match(html, /html\.touch-workspace-layout #studyRelatedPassagesSection\s*\{\s*padding: \.5rem !important; gap: \.35rem !important;/);
  assert.match(html, /html\.touch-workspace-layout #headerControlsPanel\.is-menu-closed \{ display: none !important; \}/);
  assert.match(html, /if \(notesButton && isTouchWorkspaceLayout\(\)\)/);
  assert.match(html, /function setAIDrawerOpen\(open\)[\s\S]*?const isMobileLayout = isTouchWorkspaceLayout\(\);/);
  assert.match(html, /html, body\s*\{\s*width: 100%;\s*max-width: 100%;\s*overflow-x: hidden;\s*overflow-x: clip;\s*overscroll-behavior-x: none;/);
  assert.match(html, /body\s*\{\s*touch-action: pan-y pinch-zoom;/,
    'mobile document must allow vertical scrolling and pinch zoom without horizontal touch panning');
  assert.match(html, /#workspacePanel\.workspace-mobile-closed\s*\{\s*transform: translateX\(100%\) !important;/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?#studyRelatedPassagesSection\s*\{\s*padding: \.5rem !important;\s*gap: \.35rem !important;/);
  assert.match(html, /#studyRelatedPassagesSection > div:first-child > div:first-child > p:nth-child\(2\),\s*#studyRelatedPassageStatus\s*\{\s*display: none !important;/);
  assert.match(html, /#studyRelatedPassageList\.is-mobile-collapsed\s*\{\s*display: none;\s*\}/);
  assert.match(html, /id="toggleStudyRelatedPassagesBtn"[^>]*aria-controls="studyRelatedPassageList"[^>]*aria-expanded="false"/);
  assert.match(html, /id="openStudyRelatedPassagesBtn"/);
});
