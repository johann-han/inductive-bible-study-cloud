const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/202611040001_security_hardening.sql'),
  'utf8'
);
const bootstrap = fs.readFileSync(path.join(root, 'supabase_schema.sql'), 'utf8');
const tables = ['study_records', 'kerygma_sermons'];

test('client roles cannot access private IBS tables anonymously', () => {
  for (const table of tables) {
    assert.match(migration, new RegExp('revoke\\s+all\\s+on\\s+table\\s+public\\.' + table + '\\s+from\\s+public', 'i'));
    assert.match(migration, new RegExp('revoke\\s+all\\s+on\\s+table\\s+public\\.' + table + '\\s+from\\s+anon', 'i'));
  }
});

test('authenticated users receive only the required CRUD table grants', () => {
  for (const table of tables) {
    assert.match(migration, new RegExp('revoke\\s+all\\s+on\\s+table\\s+public\\.' + table + '\\s+from\\s+authenticated', 'i'));
    assert.match(migration, new RegExp('grant\\s+select\\s*,\\s*insert\\s*,\\s*update\\s*,\\s*delete\\s+on\\s+table\\s+public\\.' + table + '\\s+to\\s+authenticated', 'i'));
  }
  assert.doesNotMatch(migration, /grant\s+all\s+on\s+table\s+public\./i);
});

test('both tables retain SELECT, INSERT, UPDATE and DELETE row policies tied to auth.uid()', () => {
  for (const table of tables) {
    for (const operation of ['select', 'insert', 'update', 'delete']) {
      const policy = new RegExp(
        'create\\s+policy[\\s\\S]*?on\\s+public\\.' + table +
        '\\s+for\\s+' + operation + '[\\s\\S]*?(?=create\\s+policy|$)',
        'i'
      );
      const match = migration.match(policy);
      assert.ok(match, table + ' is missing its ' + operation.toUpperCase() + ' policy');
      assert.match(match[0], /auth\.uid\(\)/i);
      assert.match(match[0], /\(select\s+auth\.uid\(\)\)/i);
    }
  }
});

test('security migration contains no data-destructive statements', () => {
  assert.doesNotMatch(migration, /\b(drop\s+table|truncate\s+table|delete\s+from)\b/i);
});

test('bootstrap schema retains matching grants and optimized per-user policy expressions', () => {
  for (const table of tables) {
    assert.match(bootstrap, new RegExp('revoke\\s+all\\s+on\\s+table\\s+public\\.' + table + '\\s+from\\s+public', 'i'));
    assert.match(bootstrap, new RegExp('grant\\s+select\\s*,\\s*insert\\s*,\\s*update\\s*,\\s*delete\\s+on\\s+(?:table\\s+)?public\\.' + table + '\\s+to\\s+authenticated', 'i'));
  }
  assert.doesNotMatch(bootstrap, /using\s*\(auth\.uid\(\)\s*=\s*user_id\)/i);
  assert.doesNotMatch(bootstrap, /with\s+check\s*\(auth\.uid\(\)\s*=\s*user_id\)/i);
});
