import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migrateVichyClips} from './migrate-vichy-clips.mjs';
test('creates only additive publication tables with TEXT ownership and no application upper size limit',async()=>{
 const queries=[];await migrateVichyClips({async query(sql){queries.push(sql);return {rows:sql.includes('pg_get_constraintdef')?[{definition:'CHECK ((size_bytes > 0) AND (size_bytes <= 104857600))'}]:[{type:'text'}]};}});
 assert.equal(queries[0],'BEGIN');assert.equal(queries.at(-1),'COMMIT');
 assert.ok(queries.some(sql=>sql.includes('user_id TEXT NOT NULL REFERENCES users(id)')));
 assert.ok(queries.some(sql=>sql.startsWith('ALTER TABLE')&&sql.includes('CHECK(size_bytes>0)')));
 assert.ok(queries.filter(sql=>sql.startsWith('CREATE TABLE')||sql.startsWith('ALTER TABLE')).every(sql=>!sql.includes('size_bytes<=')));
 assert.ok(queries.some(sql=>sql.includes('CHECK(duration_sec>=60)')));
 assert.ok(!queries.some(sql=>/^(DROP|DELETE|UPDATE|INSERT|ALTER TABLE users)/.test(sql)));
});
test('rejects incompatible existing identity before creating any table',async()=>{
 const queries=[];await assert.rejects(migrateVichyClips({async query(sql){queries.push(sql);return {rows:[{type:'integer'}]};}}),/TEXT/);
 assert.equal(queries.at(-1),'ROLLBACK');assert.ok(!queries.some(sql=>sql.startsWith('CREATE')));
});

test('refuses to replace unexpected constraints and rolls back without touching rows',async()=>{
 const queries=[];
 await assert.rejects(migrateVichyClips({async query(sql){queries.push(sql);return {rows:sql.includes('pg_get_constraintdef')?[{definition:'CHECK (size_bytes > 1000)'}]:[{type:'text'}]};}}),/Unexpected publication/);
 assert.equal(queries.at(-1),'ROLLBACK');
 assert.ok(!queries.some(sql=>sql.startsWith('ALTER TABLE')));
});
test('is idempotent once both constraints contain positivity only',async()=>{
 const queries=[];
 await migrateVichyClips({async query(sql){queries.push(sql);return {rows:sql.includes('pg_get_constraintdef')?[{definition:"CHECK ((size_bytes > 0))"}]:[{type:'text'}]};}});
 assert.equal(queries.at(-1),'COMMIT');assert.ok(!queries.some(sql=>sql.startsWith('ALTER TABLE')));
});

test('upgrades the staged 2GiB constraint without deleting or rewriting rows',async()=>{
 const queries=[];await migrateVichyClips({async query(sql){queries.push(sql);return {rows:sql.includes('pg_get_constraintdef')?[{definition:"CHECK (((size_bytes > 0) AND (size_bytes <= '2147483648'::bigint)))"}]:[{type:'text'}]};}});
 assert.equal(queries.filter(sql=>sql.startsWith('ALTER TABLE')).length,2);
 assert.ok(!queries.some(sql=>/^(UPDATE|DELETE|INSERT|DROP TABLE)/.test(sql)));
 assert.equal(queries.at(-1),'COMMIT');
});
