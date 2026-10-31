import pg from 'pg';

// Explicit operator-only inventory. No DDL, DML, row values, URLs or secrets.
export async function auditProductionData(client) {
  await client.query('BEGIN READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout = '10s'");
    const {rows:tables}=await client.query(`SELECT table_schema,table_name FROM information_schema.tables
      WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')
      ORDER BY table_schema,table_name`);
    const {rows:columns}=await client.query(`SELECT table_schema,table_name,column_name,data_type FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog','information_schema')
      ORDER BY table_schema,table_name,ordinal_position`);
    console.log('PRODUCTION_SCHEMA_TABLES',JSON.stringify(tables));
    console.log('PRODUCTION_SCHEMA_COLUMNS',JSON.stringify(columns));
    const wanted=new Set(['users','user_sessions','sessions','clips','hm_messages','conversations','dm_messages','dm_rooms','dm_room_members','competitions','posts','pulse_posts','business','education','archon_dna','user_settings','citizen_profiles','archon_profiles','learn_courses']);
    const counts=[];
    for(const table of tables) {
      if(!wanted.has(table.table_name))continue;
      const quote=name=>'"'+name.replaceAll('"','""')+'"';
      const result=await client.query(`SELECT count(*)::text AS count FROM ${quote(table.table_schema)}.${quote(table.table_name)}`);
      counts.push({...table,count:result.rows[0].count});
    }
    console.log('PRODUCTION_DATA_COUNTS',JSON.stringify(counts));
    const configured=Object.fromEntries(['DATABASE_URL','DATABASE_URL_UNPOOLED','POSTGRES_URL','NEON_PROJECT_ID','R2_PUBLIC_URL','R2_BUCKET','R2_BUCKET_NAME'].map(name=>[name,!!process.env[name]]));
    const connection=new URL(process.env.DATABASE_URL);
    console.log('PRODUCTION_CONNECTION_METADATA',JSON.stringify({configured,isNeon:connection.hostname.endsWith('.neon.tech'),usesPooler:connection.hostname.includes('-pooler.'),alternateMatchesCurrent:process.env.DATABASE_URL_UNPOOLED?new URL(process.env.DATABASE_URL_UNPOOLED).hostname.replace('-pooler.','.')===connection.hostname.replace('-pooler.','.'):null}));
    await client.query('COMMIT');
  } catch(error) {await client.query('ROLLBACK').catch(()=>{});throw error;}
}
export async function runProductionDataAudit() {
  if(!process.env.DATABASE_URL)throw new Error('Production database configuration required');
  const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
  try {await client.connect();await auditProductionData(client);} finally {await client.end();}
}
