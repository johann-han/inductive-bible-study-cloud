'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(root, 'scripts/start.js'), 'utf8');

test('PR preview startup builds frontend output when the preview build artifact is missing', () => {
  assert.match(bootstrap, /process\.env\.IS_PULL_REQUEST\s*===\s*'true'/);
  assert.match(bootstrap, /!fs\.existsSync\(previewIndex\)/);
  assert.match(bootstrap, /const \{ build \} = require\('vite'\)/);
  assert.match(bootstrap, /await build\(\{ configFile: viteConfig \}\)/);
  assert.match(bootstrap, /next-preview\/index\.html/);
});

test('production startup does not invoke the preview-only build path', () => {
  assert.match(bootstrap, /if \(process\.env\.IS_PULL_REQUEST === 'true' && !fs\.existsSync\(previewIndex\)\)/);
  assert.match(bootstrap, /require\(path\.join\(root, 'server\.js'\)\)/);
});
