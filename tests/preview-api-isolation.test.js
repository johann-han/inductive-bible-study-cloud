'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('Render PR previews disable API routes before any production API handler can execute', () => {
  assert.match(server, /const IS_PULL_REQUEST_PREVIEW = process\.env\.IS_PULL_REQUEST === 'true'/);
  const requestHandler = server.indexOf('const server = http.createServer');
  const requestUrl = server.indexOf('const url = new URL(req.url', requestHandler);
  const previewGuard = server.indexOf("if (IS_PULL_REQUEST_PREVIEW && url.pathname.startsWith('/api/'))", requestHandler);
  const firstApiHandler = server.indexOf("if (req.method === 'GET' && url.pathname === '/api/standard-cross-references')", requestHandler);
  assert.ok(requestHandler >= 0 && requestUrl > requestHandler);
  assert.ok(previewGuard > requestUrl && previewGuard < firstApiHandler);
  assert.match(server.slice(previewGuard, firstApiHandler), /return send\(res, 503/);
  assert.match(server.slice(previewGuard, firstApiHandler), /Application APIs are disabled in pull request previews/);
});

test('Production API handlers remain behind the preview-only conditional', () => {
  assert.match(server, /if \(IS_PULL_REQUEST_PREVIEW && url\.pathname\.startsWith\('\\/api\\/'\)\)/);
  assert.match(server, /url\.pathname === '\\/api\\/config'/);
  assert.match(server, /url\.pathname === '\\/api\\/admin\\/invite'/);
  assert.match(server, /url\.pathname === '\\/api\\/mentor'/);
});
