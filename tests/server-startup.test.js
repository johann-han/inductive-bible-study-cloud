'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('production server listens on the configured host and port', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(
    source,
    /const HOST = process\.env\.HOST \|\| '0\.0\.0\.0';[\s\S]*server\.listen\(PORT,\s*HOST,\s*\(\)\s*=>\s*console\.log\(/
  );
});
