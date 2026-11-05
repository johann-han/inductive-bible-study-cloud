const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('public client-side account creation has been removed', () => {
  assert.doesNotMatch(app, /cloudSignUpBtn/);
  assert.doesNotMatch(app, /auth\.signUp\s*\(/);
  assert.match(app, /invitation only/i);
});

test('administrator status is based on a verified Supabase session and configured email allowlist', () => {
  assert.match(server, /\/api\/admin\/status/);
  assert.match(server, /\/auth\/v1\/user/);
  assert.match(server, /IBS_ADMIN_EMAILS/);
  assert.match(server, /email_confirmed_at/);
  assert.match(server, /isConfiguredIbsAdmin\(auth\.user\)/);
});

test('invitation endpoint is authenticated, admin-only and rate-limited', () => {
  const start = server.indexOf("url.pathname === '/api/admin/invite'");
  const end = server.indexOf("url.pathname === '/api/config'", start);
  assert.ok(start >= 0 && end > start, 'invitation route must exist before public config route');
  const route = server.slice(start, end);
  assert.match(route, /verifySupabaseRequestUser\(req\)/);
  assert.match(route, /isConfiguredIbsAdmin\(auth\.user\)/);
  assert.match(route, /consumeAdminInviteLimit\(auth\.user\.id\)/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /\/auth\/v1\/invite/);
});

test('service-role credentials are not returned to browser configuration', () => {
  const start = server.indexOf("url.pathname === '/api/config'");
  const end = server.indexOf("url.pathname === '/healthz'", start);
  assert.ok(start >= 0 && end > start, 'public config route must exist');
  const route = server.slice(start, end);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY\s*:/);
  assert.doesNotMatch(route, /SUPABASE_SECRET_KEY\s*:/);
});

test('invited users can set a password after accepting their invitation', () => {
  assert.match(app, /cloudPasswordSetupPanel/);
  assert.match(app, /auth\.updateUser\(\{\s*password\s*\}\)/);
  assert.match(app, /cloudSavePasswordBtn/);
});

test('administrator invitation UI sends only the invitee email to the server', () => {
  assert.match(app, /\/api\/admin\/invite/);
  assert.match(app, /JSON\.stringify\(\{\s*email\s*\}\)/);
  assert.match(app, /cloudAdminInvitePanel/);
});


test('Home page is the invitation-only sign-in entry point', () => {
  assert.match(app, /id="homeAuthPanel"/);
  assert.match(app, /id="homeAuthForm"/);
  assert.match(app, /id="homeCloudEmail"/);
  assert.match(app, /id="homeCloudPassword"/);
  assert.match(app, /auth\.signInWithPassword\(\{ email, password \}\)/);
  assert.match(app, /function updateHomeAccessUI\(\)/);
  assert.match(app, /authPanel\.style\.display = signedIn \? 'none' : ''/);
  assert.match(app, /dashboard\.style\.display = signedIn/);
});

test('study dashboard and Bible reader are gated behind an authenticated session', () => {
  assert.match(app, /id="studyDashboardHome" style="display:none"/);
  assert.match(app, /if \(!cloudSyncState\.user\) \{\s*updateHomeAccessUI\(\);\s*return;\s*\}\s*saveActiveStudyNote\(\);/);
  assert.match(app, /function showBibleReader\(\) \{\s*if \(!cloudSyncState\.user\)/);
  assert.match(app, /if \(reader && !signedIn\) reader\.style\.display = 'none'/);
});


test('Home dashboard exposes administrator invitations and sign-out after login', () => {
  const dashboardStart = app.indexOf('id="studyDashboardHome"');
  const dashboardEnd = app.indexOf('<!-- LOCAL STUDY LIBRARY -->', dashboardStart);
  assert.ok(dashboardStart >= 0 && dashboardEnd > dashboardStart, 'dashboard markup must exist');
  const dashboard = app.slice(dashboardStart, dashboardEnd);
  assert.match(dashboard, /id="cloudAdminInvitePanel"/);
  assert.match(dashboard, /id="cloudInviteSendBtn"/);
  assert.match(dashboard, /id="homeSignOutBtn"/);
  assert.match(app, /homeSignOut\.addEventListener\('click'/);
});
