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
  assert.match(route, /getSupabaseServiceKey\(\)/);
  assert.match(server, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(server, /\/auth\/v1\/invite/);
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

test('public IBS access request form collects contact details without enabling public registration', () => {
  assert.match(app, /id="homeAccessRequestForm"/);
  assert.match(app, /id="homeAccessRequestName"[^>]*required/);
  assert.match(app, /id="homeAccessRequestEmail"[^>]*type="email"[^>]*required/);
  assert.match(app, /id="homeAccessRequestConsent"[^>]*required/);
  assert.match(app, /Submitting it does not create an account/);
  assert.match(app, /fetch\('\/api\/access-requests'/);
  assert.doesNotMatch(app, /auth\.signUp\s*\(/);
});

test('public access request endpoint validates input, rate-limits requests and stores them server-side', () => {
  const start = server.indexOf("url.pathname === '/api/access-requests'");
  const end = server.indexOf("url.pathname === '/api/admin/status'", start);
  assert.ok(start >= 0 && end > start, 'public request endpoint must exist before administrator routes');
  const route = server.slice(start, end);
  assert.match(route, /consumeAccessRequestLimit\(email\)/);
  assert.match(route, /fullName\.length/);
  assert.match(route, /ibs_access_requests/);
  assert.match(route, /getSupabaseServiceKey\(\)/);
  assert.match(route, /body\.website/);
  assert.doesNotMatch(route, /auth\.signUp/);
});

test('access request records are private and available only to the server service role', () => {
  const migrationPath = path.join(root, 'supabase', 'migrations', '20261105190000_ibs_access_requests.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(migration, /create table if not exists public\.ibs_access_requests/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.ibs_access_requests from anon/i);
  assert.match(migration, /revoke all on table public\.ibs_access_requests from authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.ibs_access_requests to service_role/i);
  assert.match(migration, /where status = 'pending'/i);
});

test('only an approved administrator can view and review access requests', () => {
  assert.match(server, /url\.pathname === '\/api\/admin\/access-requests'/);
  assert.match(server, /isConfiguredIbsAdmin\(auth\.user\)/);
  assert.match(server, /accessRequestAction/);
  assert.match(server, /sendIbsInvitation\(String\(request\.email/);
  assert.match(server, /status: 'invited'/);
  assert.match(server, /status: 'declined'/);
});

test('administrator dashboard renders pending request data safely and exposes review actions', () => {
  assert.match(app, /id="ibsAccessRequestsPanel"/);
  assert.match(app, /id="refreshIbsAccessRequestsBtn"/);
  assert.match(app, /textContent = String\(request\.full_name/);
  assert.match(app, /Approve and send invitation/);
  assert.match(app, /reviewIbsAccessRequest\(request\.id, 'invite'/);
  assert.match(app, /reviewIbsAccessRequest\(request\.id, 'decline'/);
});

