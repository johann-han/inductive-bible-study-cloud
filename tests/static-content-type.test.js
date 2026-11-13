'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getStaticContentType } = require('../lib/static-content-type');

test('Vite CSS bundles are served as stylesheets, not generic binary data', () => {
  assert.equal(getStaticContentType('/next-preview/assets/index-abc123.css'), 'text/css; charset=utf-8');
  assert.equal(getStaticContentType('/next-preview/assets/theme.CSS'), 'text/css; charset=utf-8');
});

test('static frontend scripts, icons and fonts receive browser-compatible MIME types', () => {
  assert.equal(getStaticContentType('/next-preview/assets/index-abc123.js'), 'text/javascript; charset=utf-8');
  assert.equal(getStaticContentType('/next-preview/assets/brand.svg'), 'image/svg+xml');
  assert.equal(getStaticContentType('/next-preview/assets/interface.woff2'), 'font/woff2');
});

test('unknown static file extensions retain the safe binary fallback', () => {
  assert.equal(getStaticContentType('/downloads/archive.bin'), 'application/octet-stream');
});

test('the HTTP server uses the shared static content-type resolver', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /require\(['"]\.\/lib\/static-content-type['"]\)/);
  assert.match(server, /getStaticContentType\(filePath\)/);
});
