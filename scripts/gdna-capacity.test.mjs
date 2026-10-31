import test from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import vm from 'node:vm';
const archive = new AdmZip(new URL('../api-server.zip', import.meta.url).pathname);
const runtime = archive.readAsText('api-server/dist/index.mjs');
const coreSource = runtime.slice(runtime.indexOf('var GDNA_PERSONA ='), runtime.indexOf('var configured;', runtime.indexOf('var GDNA_PERSONA =')));
const sandbox = {};
vm.runInNewContext(coreSource + ';this.parseAsk=parseAsk;this.createGdnaCore=createGdnaCore;', sandbox);
test('100000 character input is accepted; 100001 and invalid sections are rejected', () => {
  assert.equal(sandbox.parseAsk({query:'ا'.repeat(100000),section:'hisn'}).query.length,100000);
  assert.throws(()=>sandbox.parseAsk({query:'x'.repeat(100001),section:'hisn'}));
  assert.throws(()=>sandbox.parseAsk({query:'hi',section:'system'}));
  assert.match(runtime,/askGdnaBodyQueryMax = 1e5/);
  assert.match(runtime,/gdnaBody = .*json\(\{ limit: "1mb"/);
});
test('textual account IDs work, long answers are not discarded by the old 8000 character guard', async () => {
  const seen=[];
  const core=sandbox.createGdnaCore({
    retrieve:async()=>({data:{},suggestions:[],citations:[]}),usage:async()=>({used:0,limit:2000}),
    blocked:()=>false, available:()=>true,reserve:async()=>{seen.push('reserve');return {allowed:true,used:1,limit:2000};},
    complete:async()=>{seen.push('complete');return JSON.stringify({reply:'a'.repeat(20000),suggestions:[]});},
    audit:async()=> 'audit',remember:async()=>assert.fail('memory is opt-in'),
  });
  const result=await core.ask('hello',{section:'hisn',user:'opaque-citizen-id'});
  assert.equal(result.mode,'llm');assert.ok(result.reply.length>20000);assert.deepEqual(seen,['reserve','complete']);
  await assert.rejects(core.ask('hello',{section:'hisn',user:0}),/Login/);
});
const reserveSource=runtime.slice(runtime.indexOf('async function reserveGdnaUsage('),runtime.indexOf('async function gdnaMemory('));
test('both daily boundaries reserve atomically and report 2000 per account', async () => {
  for (const [userUsed,globalUsed,allowed] of [[1999,19999,true],[2000,0,false],[0,20000,false]]) {
    const calls=[];
    const client={release(){calls.push('release');},async query(sql){calls.push(sql);
      if(sql.includes(' AS day'))return {rows:[{day:'2026-10-31'}]};
      if(sql.startsWith('SELECT scope'))return {rows:[{scope:'user:citizen',used:userUsed},{scope:'global',used:globalUsed}]};
      return {rows:[]};
    }};
    const context={platform:{accountDailyLimit:2000,globalDailyLimit:20000}};
    vm.runInNewContext(reserveSource+';this.reserve=reserveGdnaUsage;',context);
    const result=await context.reserve('citizen',{connect:async()=>client});
    assert.equal(result.allowed,allowed);assert.equal(result.limit,2000);
    assert.equal(calls.some(sql=>sql.startsWith('UPDATE gdna_usage')),allowed);
    assert.ok(calls.indexOf('SELECT pg_advisory_xact_lock(734201991)')<calls.indexOf('COMMIT'));
    assert.equal(calls.at(-1),'release');
  }
});
test('original adapter and shipped runtime agree; no legacy upload cap or Infinity sentinel', () => {
  const source=archive.readAsText('api-server/src/lib/gdna.ts');
  assert.match(source,/globalDailyLimit: 20000, accountDailyLimit: 2000/);
  assert.match(source,/maxCompletionTokens: 100000/);
  assert.match(runtime,/max_completion_tokens: platform.maxCompletionTokens/);
  assert.match(runtime,/hashtext\(\$1::text\)/);
  for(const entry of archive.getEntries()) {
    if(!/\.(ts|mjs)$/.test(entry.entryName))continue;
    const text=entry.getData().toString();
    assert.doesNotMatch(text,/MAX_(?:NEW_)?CLIP_BYTES/,entry.entryName);
  }
  assert.doesNotMatch(archive.readAsText('api-server/src/lib/clip-upload-protocol.ts'),/Infinity|POSITIVE_INFINITY/);
});
