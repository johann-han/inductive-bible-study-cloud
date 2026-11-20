'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(root, 'scripts/start.js'), 'utf8');

test('PR preview startup always rebuilds the frontend from the checked-out pull-request source', () => {
  assert.match(bootstrap, /if \(process\.env\.IS_PULL_REQUEST === 'true'\)/);
  assert.doesNotMatch(bootstrap, /!fs\.existsSync\(previewIndex\)/);
  assert.match(bootstrap, /const \{ build \} = require\('vite'\)/);
  assert.match(bootstrap, /await build\(\{ configFile: viteConfig \}\)/);
  assert.match(bootstrap, /require\('node:fs'\)\.existsSync\(previewIndex\)/);
  assert.match(bootstrap, /next-preview\/index\.html/);
});

test('production startup leaves the frontend build outside the normal server startup path', () => {
  assert.match(bootstrap, /if \(process\.env\.IS_PULL_REQUEST === 'true'\)/);
  assert.match(bootstrap, /require\(path\.join\(root, 'server\.js'\)\)/);
});
