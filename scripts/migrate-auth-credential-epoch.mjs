import pg from 'pg';

// Explicit deployment maintenance only; never run DDL on application startup.
export async function migrateCredentialEpoch(client) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SELECT pg_advisory_xact_lock(782341901)");
    // pg int8 values are strings by default. Session fencing requires a JS number,
    // matching usersTable's integer schema, not BIGINT or a constant fallback.
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS credential_epoch INTEGER NOT NULL DEFAULT 0');
    const { rows } = await client.query(`SELECT a.atttypid = 'integer'::regtype AS integer_type,
      a.attnotnull AS not_null, pg_get_expr(d.adbin, d.adrelid) AS default_value
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = 'users'::regclass AND a.attname = 'credential_epoch' AND NOT a.attisdropped`);
    if (rows.length !== 1 || !rows[0].integer_type || !rows[0].not_null || rows[0].default_value !== '0') {
      throw new Error('Unexpected credential_epoch schema; manual review required');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

export async function runCredentialEpochMigration() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required for explicit auth migration');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await migrateCredentialEpoch(client);
    console.log('Auth migration verified: credential_epoch INTEGER NOT NULL DEFAULT 0. Existing accounts and password hashes preserved.');
  } finally {
    await client.end();
  }
}
