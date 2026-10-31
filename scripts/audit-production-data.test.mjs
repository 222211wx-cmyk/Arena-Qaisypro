import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditProductionData} from './audit-production-data.mjs';
test('inventory is read only and reports metadata/counts, not row contents or credentials',async()=>{
 const queries=[];const logs=[];const original=console.log;const old=process.env.DATABASE_URL;
 process.env.DATABASE_URL='postgresql://secret:never-print@ep-test-pooler.test.neon.tech/example';
 console.log=(...values)=>logs.push(values);
 try{
 await auditProductionData({async query(sql){queries.push(sql);
  if(sql.includes("table_type='BASE TABLE'"))return {rows:[{table_schema:'public',table_name:'users'}]};
  if(sql.includes('information_schema.columns'))return {rows:[{table_schema:'public',table_name:'users',column_name:'id',data_type:'text'}]};
  if(sql.startsWith('SELECT count'))return {rows:[{count:'2'}]};
  return {rows:[]};
 }});
 assert.equal(queries[0],'BEGIN READ ONLY');assert.equal(queries.at(-1),'COMMIT');
 assert.ok(queries.every(sql=>/^(BEGIN READ ONLY|SET LOCAL|SELECT|COMMIT)/.test(sql)));
 assert.ok(!JSON.stringify(logs).includes('never-print'));
 assert.ok(!queries.some(sql=>/SELECT \*/.test(sql)));
 }finally{console.log=original;if(old===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=old;}
});
