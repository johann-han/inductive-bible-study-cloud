'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendAccessRequestNotification } = require('../lib/ibs-access-request-email');

test('access request notification sends the expected administrator email through Resend', async () => {
  const previous = {
    key: process.env.RESEND_API_KEY,
    from: process.env.IBS_NOTIFICATION_FROM,
    to: process.env.IBS_ACCESS_REQUEST_NOTIFICATION_EMAIL,
    fetch: global.fetch
  };
  let sent;
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.IBS_NOTIFICATION_FROM = 'IBS Workspace <notifications@example.com>';
  process.env.IBS_ACCESS_REQUEST_NOTIFICATION_EMAIL = 'johann@woordvanlewe.co.za';
  global.fetch = async (url, options) => {
    sent = { url, options };
    return { ok: true };
  };
  try {
    const result = await sendAccessRequestNotification({
      fullName: 'Test Applicant',
      email: 'applicant@example.com',
      churchOrMinistry: 'Test Church',
      message: 'I want to study Scripture.'
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(sent.url, 'https://api.resend.com/emails');
    assert.equal(sent.options.headers.Authorization, 'Bearer test-resend-key');
    const payload = JSON.parse(sent.options.body);
    assert.deepEqual(payload.to, ['johann@woordvanlewe.co.za']);
    assert.match(payload.text, /Test Applicant/);
    assert.match(payload.text, /applicant@example.com/);
    assert.match(payload.text, /Reason: I want to study Scripture\./);
    assert.match(payload.html, /https:\/\/study\.woordvanlewe\.co\.za\//);
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of Object.entries({
      RESEND_API_KEY: previous.key,
      IBS_NOTIFICATION_FROM: previous.from,
      IBS_ACCESS_REQUEST_NOTIFICATION_EMAIL: previous.to
    })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('notification safely skips when Resend configuration is absent', async () => {
  const previous = {
    key: process.env.RESEND_API_KEY,
    from: process.env.IBS_NOTIFICATION_FROM
  };
  delete process.env.RESEND_API_KEY;
  delete process.env.IBS_NOTIFICATION_FROM;
  try {
    assert.deepEqual(
      await sendAccessRequestNotification({ fullName: 'Test', email: 'test@example.com' }),
      { ok: false, reason: 'not_configured' }
    );
  } finally {
    if (previous.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previous.key;
    if (previous.from === undefined) delete process.env.IBS_NOTIFICATION_FROM; else process.env.IBS_NOTIFICATION_FROM = previous.from;
  }
});

test('notification escapes applicant-provided content before inserting it into HTML', async () => {
  const previous = {
    key: process.env.RESEND_API_KEY,
    from: process.env.IBS_NOTIFICATION_FROM,
    fetch: global.fetch
  };
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.IBS_NOTIFICATION_FROM = 'IBS Workspace <notifications@example.com>';
  let payload;
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true };
  };
  try {
    await sendAccessRequestNotification({
      fullName: '<script>alert(1)</script>',
      email: 'safe@example.com',
      message: '<img src=x onerror=alert(1)>'
    });
    assert.doesNotMatch(payload.html, /<script>|<img/);
    assert.match(payload.html, /&lt;script&gt;/);
  } finally {
    global.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previous.key;
    if (previous.from === undefined) delete process.env.IBS_NOTIFICATION_FROM; else process.env.IBS_NOTIFICATION_FROM = previous.from;
  }
});

test('saved access requests trigger a non-blocking administrator notification', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const start = server.indexOf("url.pathname === '/api/access-requests'");
  const end = server.indexOf("url.pathname === '/api/admin/status'", start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.match(route, /await sendAccessRequestNotification\(\{/);
  assert.match(route, /if \(!notification\.ok\) console\.warn/);
  assert.match(route, /return send\(res, 200, \{ ok: true, message: accessRequestPublicMessage\(\) \}\)/);
});

test('duplicate pending request refreshes saved details before retrying notification without a second insert', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const start = server.indexOf("url.pathname === '/api/access-requests'");
  const end = server.indexOf("url.pathname === '/api/admin/status'", start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.ok(route.includes("lookupUrl.searchParams.set('select', 'id,full_name,email,church_or_ministry,message')"));
  assert.ok(route.includes("method: 'PATCH'"));
  assert.ok(route.includes("updateUrl.searchParams.set('status', 'eq.pending')"));
  assert.ok(route.includes("message: message || null"));
  assert.ok(route.includes("const savedRequest = updatedRows[0]"));
  assert.ok(route.includes("fullName: savedRequest.full_name"));
  assert.ok(route.includes("email: savedRequest.email"));
  assert.ok(route.includes("message: savedRequest.message"));
  assert.ok(route.includes("if (!notification.ok) console.warn('Pending IBS access request notification retry was not sent.')"));
});
