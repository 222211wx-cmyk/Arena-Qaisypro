import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migrateVichyClips} from './migrate-vichy-clips.mjs';
test('creates only additive publication tables with TEXT ownership and exact size limit',async()=>{
 const queries=[];await migrateVichyClips({async query(sql){queries.push(sql);return {rows:[{type:'text'}]};}});
 assert.equal(queries[0],'BEGIN');assert.equal(queries.at(-1),'COMMIT');
 assert.ok(queries.some(sql=>sql.includes('user_id TEXT NOT NULL REFERENCES users(id)')));
 assert.ok(queries.some(sql=>sql.includes('size_bytes<=104857600')));
 assert.ok(!queries.some(sql=>/^(DROP|DELETE|UPDATE|INSERT|ALTER TABLE users)/.test(sql)));
});
test('rejects incompatible existing identity before creating any table',async()=>{
 const queries=[];await assert.rejects(migrateVichyClips({async query(sql){queries.push(sql);return {rows:[{type:'integer'}]};}}),/TEXT/);
 assert.equal(queries.at(-1),'ROLLBACK');assert.ok(!queries.some(sql=>sql.startsWith('CREATE')));
});
