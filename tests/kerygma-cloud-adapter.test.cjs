'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { KerygmaCloudAdapter } = require('../sermon-preview/cloud-adapter');
const CloudSync = require('../sermon/cloud-sync');

function storageFixture(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  const removals = [];
  return {
    values,
    writes,
    removals,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { writes.push(key); values.set(key, String(value)); },
    removeItem(key) { removals.push(key); values.delete(key); }
  };
}

function sermon(id, title, updatedAt = '2026-11-20T08:00:00.000Z') {
  return {
    id,
    title,
    passage: 'Romans 2:1-16',
    text: 'Therefore you have no excuse.',
    outline: [],
    illustrations: [],
    manuscript: '',
    updated_at: updatedAt,
    inductiveStudySource: {
      format: 'inductive-bible-study-sermon-source',
      version: 1,
      sections: { observe: 'Observe', interpret: 'Interpret', doctrine: 'Doctrine', discipleship: 'Discipleship' }
    }
  };
}

function createSupabaseMock({ session = null, rows = [], upsertError = null } = {}) {
  const upserts = [];
  const calls = [];
  const client = {
    auth: {
      async getSession() { return { data: { session }, error: null }; },
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }
    },
    from(table) {
      calls.push({ method: 'from', table });
      return {
        select(columns) {
          calls.push({ method: 'select', table, columns });
          return {
            async eq(column, value) {
              calls.push({ method: 'eq', table, column, value });
              return { data: rows, error: null };
            }
          };
        },
        async upsert(values, options) {
          upserts.push({ table, values, options });
          return upsertError ? { error: upsertError } : { error: null };
        }
      };
    }
  };
  return { client, upserts, calls };
}

function createAdapter({ storage, supabase, sermons = [], currentId = null, onChange, onStatus } = {}) {
  return new KerygmaCloudAdapter({
    storage,
    ensureSupabaseClient: async () => {},
    getSupabaseClient: () => supabase.client,
    getSermons: () => sermons,
    getCurrentSermonId: () => currentId,
    onSermonsChanged: onChange || (() => {}),
    onStatus: onStatus || (() => {}),
    cloudSync: CloudSync
  });
}

test('cloud adapter keeps local sermons and claim-review statuses when no session exists', async () => {
  const local = sermon('sermon-1', 'Saved local sermon');
  const statuses = { 'sermon-1': { 'p1-claim': 'needs-research' } };
  const storage = storageFixture({
    kerygma_sermons: JSON.stringify([local]),
    kerygma_claim_review_status_v1: JSON.stringify(statuses)
  });
  const supabase = createSupabaseMock({ session: null });
  let changed = 0;
  const messages = [];
  const adapter = createAdapter({
    storage,
    supabase,
    sermons: [local],
    currentId: local.id,
    onChange: () => { changed += 1; },
    onStatus: (message, tone) => messages.push({ message, tone })
  });

  assert.equal(await adapter.syncCloudSermons(), false);
  assert.equal(adapter.cloudSyncReady, false);
  assert.equal(storage.getItem('kerygma_sermons'), JSON.stringify([local]));
  assert.deepEqual(JSON.parse(storage.getItem('kerygma_claim_review_status_v1')), statuses);
  assert.equal(supabase.calls.some(call => call.method === 'from'), false);
  assert.equal(supabase.upserts.length, 0);
  assert.equal(changed, 0);
  assert.equal(messages.at(-1).tone, 'warning');
});

test('cloud adapter merges newer local data and upserts only the existing Kerygma table contract', async () => {
  const local = sermon('sermon-a', 'Local newer', '2026-11-20T09:00:00.000Z');
  const cloudRow = {
    sermon_id: local.id,
    sermon_data: { ...local, title: 'Older cloud title' },
    updated_at: '2026-11-19T09:00:00.000Z',
    deleted_at: null
  };
  const storage = storageFixture({
    kerygma_sermons: JSON.stringify([local]),
    kerygma_local_owner_id: 'user-a',
    kerygma_claim_review_status_v1: JSON.stringify({ [local.id]: { claim: 'reviewed' } })
  });
  const supabase = createSupabaseMock({ session: { user: { id: 'user-a' } }, rows: [cloudRow] });
  let merged = [];
  const adapter = createAdapter({
    storage, supabase, sermons: [local], currentId: local.id,
    onChange: sermons => { merged = sermons; }
  });

  assert.equal(await adapter.syncCloudSermons(), true);
  assert.equal(adapter.cloudSyncReady, true);
  assert.equal(adapter.cloudUserId, 'user-a');
  assert.equal(merged[0].title, 'Local newer');
  assert.equal(JSON.parse(storage.getItem('kerygma_sermons'))[0].title, 'Local newer');
  assert.equal(storage.getItem('kerygma_local_owner_id'), 'user-a');
  assert.ok(supabase.calls.some(call => call.method === 'from' && call.table === 'kerygma_sermons'));
  const saved = supabase.upserts.find(call => call.values.some(row => row.deleted_at === null));
  assert.ok(saved);
  assert.equal(saved.values[0].user_id, 'user-a');
  assert.equal(saved.values[0].sermon_id, local.id);
  assert.equal(saved.options.onConflict, 'user_id,sermon_id');
  assert.equal(JSON.parse(storage.getItem('kerygma_claim_review_status_v1'))[local.id].claim, 'reviewed');
});

test('cloud adapter backs up a prior owner cache and never uploads it to another account', async () => {
  const previous = sermon('private-a', 'Account A private sermon');
  const accountB = sermon('private-b', 'Account B cloud sermon');
  const cloudRows = [{
    sermon_id: accountB.id,
    sermon_data: accountB,
    updated_at: accountB.updated_at,
    deleted_at: null
  }];
  const storage = storageFixture({
    kerygma_sermons: JSON.stringify([previous]),
    kerygma_local_owner_id: 'user-a'
  });
  const supabase = createSupabaseMock({ session: { user: { id: 'user-b' } }, rows: cloudRows });
  let resulting = [];
  const adapter = createAdapter({
    storage, supabase, sermons: [previous], currentId: previous.id,
    onChange: sermons => { resulting = sermons; }
  });

  await adapter.syncCloudSermons();
  assert.equal(JSON.parse(storage.getItem('kerygma_sermons_backup_user-a'))[0].id, 'private-a');
  assert.deepEqual(resulting.map(item => item.id), ['private-b']);
  const uploadedIds = supabase.upserts.flatMap(call => call.values.map(row => row.sermon_id));
  assert.ok(!uploadedIds.includes('private-a'));
  assert.ok(uploadedIds.includes('private-b'));
  assert.equal(storage.getItem('kerygma_local_owner_id'), 'user-b');
});

test('cloud adapter uploads queued tombstones before fetching and upserting the active vault', async () => {
  const deleted = sermon('deleted-sermon', 'Deleted sermon');
  const storage = storageFixture({
    kerygma_sermons: '[]',
    kerygma_local_owner_id: 'user-a',
    kerygma_pending_cloud_deletions: JSON.stringify([{ sermon_id: deleted.id, sermon_data: deleted }]),
    kerygma_pending_cloud_deletions_owner_id: 'user-a'
  });
  const supabase = createSupabaseMock({ session: { user: { id: 'user-a' } }, rows: [] });
  const adapter = createAdapter({ storage, supabase });

  await adapter.syncCloudSermons();
  assert.equal(supabase.upserts.length, 1);
  assert.equal(supabase.upserts[0].values[0].sermon_id, deleted.id);
  assert.ok(supabase.upserts[0].values[0].deleted_at);
  assert.deepEqual(JSON.parse(storage.getItem('kerygma_pending_cloud_deletions')), []);
  assert.equal(storage.getItem('kerygma_pending_cloud_deletions_owner_id'), null);
  assert.deepEqual(
    supabase.calls.filter(call => call.method === 'from').map(call => call.table),
    ['kerygma_sermons', 'kerygma_sermons']
  );
});

test('cloud adapter retains pending tombstones when Supabase rejects their upsert', async () => {
  const deleted = sermon('pending-sermon', 'Pending deletion');
  const storage = storageFixture({
    kerygma_sermons: '[]',
    kerygma_local_owner_id: 'user-a',
    kerygma_pending_cloud_deletions: JSON.stringify([{ sermon_id: deleted.id, sermon_data: deleted }]),
    kerygma_pending_cloud_deletions_owner_id: 'user-a'
  });
  const supabase = createSupabaseMock({
    session: { user: { id: 'user-a' } },
    rows: [],
    upsertError: new Error('Network unavailable')
  });
  const adapter = createAdapter({ storage, supabase });

  await assert.rejects(adapter.syncCloudSermons(), /Network unavailable/);
  assert.equal(JSON.parse(storage.getItem('kerygma_pending_cloud_deletions'))[0].sermon_id, deleted.id);
  assert.equal(storage.getItem('kerygma_pending_cloud_deletions_owner_id'), 'user-a');
  assert.equal(adapter.cloudSyncReady, false);
});

test('cloud deletion queue can be cancelled if the local sermon write fails', () => {
  const storage = storageFixture();
  const adapter = createAdapter({ storage, supabase: createSupabaseMock() });
  const target = sermon('queued-delete', 'Queued delete');

  assert.equal(adapter.queueCloudDeletion(target), true);
  assert.equal(JSON.parse(storage.getItem('kerygma_pending_cloud_deletions'))[0].sermon_id, target.id);
  assert.equal(adapter.cancelCloudDeletion(target.id), true);
  assert.deepEqual(JSON.parse(storage.getItem('kerygma_pending_cloud_deletions')), []);
  assert.equal(storage.getItem('kerygma_pending_cloud_deletions_owner_id'), null);
});

test('cloud adapter coalesces concurrent sync requests', async () => {
  const local = sermon('sermon-concurrent', 'Concurrent sync');
  const storage = storageFixture({
    kerygma_sermons: JSON.stringify([local]),
    kerygma_local_owner_id: 'user-a'
  });
  const supabase = createSupabaseMock({ session: { user: { id: 'user-a' } }, rows: [] });
  let resolveSession;
  let sessionCalls = 0;
  const sessionPromise = new Promise(resolve => { resolveSession = resolve; });
  supabase.client.auth.getSession = async () => {
    sessionCalls += 1;
    if (sessionCalls === 1) return await sessionPromise;
    return { data: { session: { user: { id: 'user-a' } } }, error: null };
  };
  const adapter = createAdapter({ storage, supabase, sermons: [local], currentId: local.id });

  const first = adapter.syncCloudSermons();
  const second = adapter.syncCloudSermons();
  resolveSession({ data: { session: { user: { id: 'user-a' } } }, error: null });
  await Promise.all([first, second]);
  assert.equal(sessionCalls, 1);
  assert.equal(adapter.cloudSyncReady, true);
  adapter.destroy();
});

test('redesigned app shares one Supabase client and keeps cloud writes disabled in the PR preview', () => {
  const path = require('node:path');
  const fs = require('node:fs');
  const root = path.join(__dirname, '..');
  const app = fs.readFileSync(path.join(root, 'sermon-preview', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'sermon-preview', 'index.html'), 'utf8');
  assert.ok(app.includes('async function ensureAppSupabaseClient()'));
  assert.ok(app.includes('async function getAIClientToken()'));
  assert.ok(app.includes('ensureSupabaseClient: ensureAppSupabaseClient'));
  assert.ok(app.includes('getSupabaseClient: () => supabaseClient'));
  assert.ok(app.includes('new Cloud.KerygmaCloudAdapter'));
  assert.ok(!app.includes('cloudAdapter.initializeCloudSermons()'));
  assert.ok(app.includes('Cloud sync held back in preview'));
  assert.ok(html.includes('/sermon/cloud-sync.js?v=298b222'));
  assert.ok(app.includes('cloudAdapter.queueCloudDeletion(sermon)'));
  assert.ok(app.includes('cloudAdapter.cancelCloudDeletion(sermonId)'));
});
