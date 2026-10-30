import {test} from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import {migrateAuthUsersSchema,missingUserColumns} from './migrate-auth-users-schema.mjs';
const identity = ['id','username','email','password_hash','credential_epoch'].map(name=>({name,type:['id','credential_epoch'].includes(name)?'integer':'text'}));
function database(columns=identity) {
  const queries=[];
  return {queries,async query(sql) {
    queries.push(sql);
    if(sql.includes("attrelid = 'users'::regclass")) return {rows:columns};
    if(sql.includes("attrelid = 'user_sessions'::regclass")) return {rows:[
      {name:'sid',type:'character varying',not_null:true},
      {name:'sess',type:'json',not_null:true},
      {name:'expire',type:'timestamp(6) without time zone',not_null:true},
    ]};
    if(sql.includes('pg_constraint'))return {rows:[{'?column?':1}]};
    return {rows:[]};
  }};
}
test('adds only absent canonical fields; preserves hashes and unknown age',async()=>{
  const client=database();await migrateAuthUsersSchema(client);
  assert.ok(client.queries.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE'));
  assert.ok(client.queries.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false'));
  assert.ok(!client.queries.some(sql=>/^(INSERT|UPDATE|DELETE|DROP)/.test(sql)));
  assert.ok(!client.queries.some(sql=>sql.startsWith('ALTER') && /password|username|email/.test(sql)));
  assert.equal(client.queries.at(-1),'COMMIT');
});
test('does not overwrite existing balance or other fields',async()=>{
  const client=database([...identity,{name:'balance',type:'integer'}]);await migrateAuthUsersSchema(client);
  assert.ok(!client.queries.some(sql=>sql.startsWith('ALTER') && sql.includes(' balance ')));
});
test('preserves legacy timezone-naive creation metadata without rewriting it',async()=>{
  const client=database([...identity,{name:'created_at',type:'timestamp without time zone'}]);
  await migrateAuthUsersSchema(client);
  assert.ok(!client.queries.some(sql=>sql.startsWith('ALTER') && sql.includes(' created_at ')));
  assert.equal(client.queries.at(-1),'COMMIT');
});
test('missing identity or incompatible column type rolls back before adding fields',async()=>{
  for(const columns of [identity.filter(row=>row.name!=='password_hash'),[...identity,{name:'birth_date',type:'text'}]]) {
    const client=database(columns);await assert.rejects(migrateAuthUsersSchema(client),/incompatible/);
    assert.equal(client.queries.at(-1),'ROLLBACK');
    assert.ok(!client.queries.some(sql=>sql.startsWith('ALTER')));
  }
});
test('column list matches actual archived usersTable fields except required identities',()=>{
  const source=new AdmZip('api-server.zip').readAsText('api-server/dist/index.mjs');
  const block=source.split('usersTable = pgTable("users", {')[1].split('}, (t) => ({')[0];
  const fields=[...block.matchAll(/(?:serial|text|integer|date|timestamp|boolean)\("([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual([...Object.keys(missingUserColumns),...identity.map(row=>row.name)].sort(),fields.sort());
});
