// Types and defaults are copied from usersTable in the archived backend.
// Do not infer account identity, password hashes, age or privileges.
export const missingUserColumns = {
  birth_date: 'DATE',
  balance: 'INTEGER NOT NULL DEFAULT 500',
  xp: 'INTEGER NOT NULL DEFAULT 0',
  games_played: 'INTEGER NOT NULL DEFAULT 0',
  wins: 'INTEGER NOT NULL DEFAULT 0',
  last_daily_reward: 'TIMESTAMP WITH TIME ZONE',
  last_dm_xp_at: 'TIMESTAMP WITH TIME ZONE',
  is_admin: 'BOOLEAN NOT NULL DEFAULT false',
  has_active_subscription: 'BOOLEAN NOT NULL DEFAULT false',
  free_messages_used: 'INTEGER NOT NULL DEFAULT 0',
  honor_count: 'INTEGER NOT NULL DEFAULT 0',
  is_muted: 'BOOLEAN NOT NULL DEFAULT false',
  honor_title: "TEXT NOT NULL DEFAULT 'Citizen'",
  is_trending: 'BOOLEAN NOT NULL DEFAULT false',
  honor_alert_sent: 'BOOLEAN NOT NULL DEFAULT false',
  welcome_broadcast_sent: 'BOOLEAN DEFAULT false',
  imperial_decree_sent: 'BOOLEAN DEFAULT false',
  last_seen_at: 'TIMESTAMP WITHOUT TIME ZONE DEFAULT now()',
  is_star: 'BOOLEAN NOT NULL DEFAULT false',
  created_at: 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()',
};
const columnsQuery = `SELECT attname AS name, format_type(atttypid, atttypmod) AS type
  FROM pg_attribute WHERE attrelid = 'users'::regclass AND attnum > 0 AND NOT attisdropped`;
function expectedType(definition) {
  if (definition.startsWith('TIMESTAMP WITH TIME ZONE')) return 'timestamp with time zone';
  if (definition.startsWith('TIMESTAMP WITHOUT TIME ZONE')) return 'timestamp without time zone';
  return definition.split(' ')[0].toLowerCase();
}
export async function migrateAuthUsersSchema(client) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query('SELECT pg_advisory_xact_lock(782341901)');
    const { rows } = await client.query(columnsQuery);
    const columns = new Map(rows.map(row => [row.name, row.type]));
    console.log('Existing users schema:', JSON.stringify(Object.fromEntries(columns)));
    for (const [name, type] of Object.entries({id:'integer',username:'text',email:'text',password_hash:'text',credential_epoch:'integer'})) {
      if (columns.get(name) !== type) throw new Error(`Required identity column incompatible: ${name}`);
    }
    for (const [name, definition] of Object.entries(missingUserColumns)) {
      // Older deployments used timezone-naive created_at. Preserve that
      // metadata column; it is not used to authorize identity or age.
      const legacyCreatedAt = name === 'created_at' && columns.get(name) === 'timestamp without time zone';
      if (columns.has(name) && columns.get(name) !== expectedType(definition) && !legacyCreatedAt) {
        throw new Error(`Existing profile column incompatible: ${name}`);
      }
    }
    const added = [];
    for (const [name, definition] of Object.entries(missingUserColumns)) {
      if (!columns.has(name)) {
        // Both identifiers and definitions are fixed source constants, not input.
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${name} ${definition}`);
        added.push(name);
      }
    }
    await client.query(`CREATE TABLE IF NOT EXISTS user_sessions (
      sid VARCHAR NOT NULL PRIMARY KEY, sess JSON NOT NULL, expire TIMESTAMP(6) NOT NULL
    )`);
    const sessions = await client.query(`SELECT attname AS name, format_type(atttypid, atttypmod) AS type,
      attnotnull AS not_null FROM pg_attribute
      WHERE attrelid = 'user_sessions'::regclass AND attnum > 0 AND NOT attisdropped`);
    const sessionColumns = new Map(sessions.rows.map(row => [row.name, row]));
    if (!/^character varying(?:\(\d+\))?$/.test(sessionColumns.get('sid')?.type ?? '') ||
        !['json', 'jsonb'].includes(sessionColumns.get('sess')?.type) ||
        !/^timestamp(?:\(\d+\))? without time zone$/.test(sessionColumns.get('expire')?.type ?? '') ||
        !['sid','sess','expire'].every(name => sessionColumns.get(name)?.not_null)) {
      throw new Error('Existing session table incompatible; review required');
    }
    const key = await client.query(`SELECT 1 FROM pg_constraint
      WHERE conrelid = 'user_sessions'::regclass AND contype IN ('p','u')
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
        WHERE attrelid = 'user_sessions'::regclass AND attname = 'sid')]::smallint[]`);
    if (!key.rows.length) throw new Error('Session sid uniqueness required');
    await client.query('COMMIT');
    console.log('Login users/session schema verified; added users columns:', added.join(', ') || 'none');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}
