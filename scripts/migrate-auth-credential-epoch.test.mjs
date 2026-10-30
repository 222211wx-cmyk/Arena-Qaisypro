import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrateCredentialEpoch } from './migrate-auth-credential-epoch.mjs';

function database(schema = { integer_type: true, not_null: true, default_value: '0' }) {
  const queries = [];
  return { queries, async query(sql) { queries.push(sql); return { rows: [schema] }; } };
}

test('migration is additive, idempotent and preserves accounts and password hashes', async () => {
  const client = database();
  await migrateCredentialEpoch(client);
  await migrateCredentialEpoch(client);
  assert.equal(client.queries.filter(sql => sql === 'COMMIT').length, 2);
  assert.ok(client.queries.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS credential_epoch INTEGER NOT NULL DEFAULT 0'));
  assert.ok(!client.queries.some(sql => /BIGINT|DROP|DELETE|INSERT|UPDATE|password|email|username/.test(sql)));
});

test('incompatible BIGINT or nullable epochs abort rather than bypass session fencing', async () => {
  for (const schema of [
    { integer_type: false, not_null: true, default_value: '0' },
    { integer_type: true, not_null: false, default_value: '0' },
    { integer_type: true, not_null: true, default_value: null },
  ]) {
    const client = database(schema);
    await assert.rejects(migrateCredentialEpoch(client), /Unexpected credential_epoch schema/);
    assert.equal(client.queries.at(-1), 'ROLLBACK');
    assert.ok(!client.queries.includes('COMMIT'));
  }
});

test('DDL failure rolls back without committing partial work', async () => {
  const client = database();
  const query = client.query.bind(client);
  client.query = async sql => { if (sql.startsWith('ALTER')) throw new Error('locked'); return query(sql); };
  await assert.rejects(migrateCredentialEpoch(client), /locked/);
  assert.equal(client.queries.at(-1), 'ROLLBACK');
});

test('normal backend builds do not run migrations without explicit opt-in', () => {
  const source = readFileSync(new URL('./prepare-original-backend.mjs', import.meta.url), 'utf8');
  assert.match(source, /if \(process.env.ARENA_MIGRATE_CREDENTIAL_EPOCH === '1'\)/);
  assert.ok(!readFileSync(new URL('../api/original.js', import.meta.url), 'utf8').includes('migrate'));
});
