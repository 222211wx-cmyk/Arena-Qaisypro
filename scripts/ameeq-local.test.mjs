import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAmeeqLocal } from '../api/ameeq.js';

function setup(options = {}) {
  const calls = [];
  const pool = { async query(query) {
    calls.push(query);
    if (options.failDB) throw new Error('private database credentials');
    return { rows: [{ citizens: '44', clips: '8' }] };
  } };
  const req = { method: 'POST', body: { command: 'شكون نتا' }, headers: { host: 'arena.test' } };
  const res = { code: 200, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code=code; return this; }, json(value) { this.body=value; return this; } };
  const handler = createAmeeqLocal({ pool, env: {}, ...options });
  return { req, res, calls, async run() { await handler(req,res); return res.body; } };
}

for (const field of ['command', 'message', 'question']) test(`identity works through ${field}, without external AI`, async () => {
  const s=setup(); s.req.body={ [field]: 'شكون نتا' }; const b=await s.run();
  assert.equal(s.res.code,200); assert.match(b.reply,/Ameeq AI EMP-001/u);
  assert.match(b.reply,/6 أقسام/u); assert.match(b.reply,/44 مواطن و 8 كليب/u);
  assert.equal(b.response,b.reply); assert.equal(b.countsVerified,true);
  assert.equal(b.source,'ameeq-imperial-local-smart'); assert.doesNotMatch(b.reply,/غير متاح/u);
  assert.equal(s.calls.length,1); assert.match(s.calls[0].text,/^SELECT /);
  assert.doesNotMatch(s.calls[0].text,/DELETE|UPDATE|INSERT|DROP|ALTER/);
  assert.equal(s.res.headers['Cache-Control'],'private, no-store');
});

test('empty, help, and general questions produce different nonempty local answers', async () => {
  const s=setup(); const replies=[];
  for (const message of ['', 'كيف نبدأ؟', 'التعليم العالي']) {
    s.req.body={message}; const b=await s.run();
    assert.equal(s.res.code,200); assert.ok(b.reply); assert.doesNotMatch(b.reply,/غير متاح/u); replies.push(b.reply);
  }
  assert.equal(new Set(replies).size,3);
});

test('DB failure does not block chat, invent live numbers, or disclose errors', async () => {
  const s=setup({failDB:true}); const b=await s.run();
  assert.equal(s.res.code,200); assert.equal(b.countsVerified,false);
  assert.doesNotMatch(b.reply,/44|8|غير متاح|credentials/u);
});

const env={ AI_INTEGRA_AI_BASE_URL:'https://provider.invalid/v1', AI_INTEGRA_API_KEY:'test-placeholder' };
test('external provider is optional, URL is normalized, and real source is reported', async () => {
  let request; const s=setup({env,fetchImpl:async(url,opts)=>{
    request={url,opts};return {ok:true,json:async()=>({choices:[{message:{content:'جواب مفيد'}}]})};
  }}); const b=await s.run();
  assert.equal(request.url,'https://provider.invalid/v1/chat/completions');
  assert.ok(request.opts.signal); assert.equal(b.source,'ameeq-imperial-external-ai');
  assert.match(b.reply,/جواب مفيد/u);
});

for (const failure of ['throw','http','empty','retired']) test(`provider ${failure} preserves useful local answer`, async () => {
  const s=setup({env,fetchImpl:async()=>{
    if(failure==='throw')throw new Error('provider-secret');
    return {ok:failure!=='http',json:async()=>({choices:[{message:{content:failure==='retired'?'محرك الذكاء غير متاح دبا':''}}]})};
  }}); const b=await s.run(); assert.equal(s.res.code,200);
  assert.equal(b.source,'ameeq-imperial-local-smart'); assert.match(b.reply,/EMP-001/);
  assert.doesNotMatch(JSON.stringify(b),/غير متاح|provider-secret/u);
});

test('retired error is not repeated even if quoted in the question', async()=>{
  const s=setup();s.req.body={message:'محرك الذكاء غير متاح دبا'};
  assert.doesNotMatch((await s.run()).reply,/غير متاح/u);
});

test('cross-origin and malformed input fail before database access', async()=>{
  for (const body of [{message:123},{question:'x'.repeat(501)}]) {
    const s=setup();s.req.body=body;await s.run();assert.equal(s.res.code,400);assert.equal(s.calls.length,0);
  }
  const s=setup();s.req.headers.origin='https://attacker.invalid';await s.run();
  assert.equal(s.res.code,403);assert.equal(s.calls.length,0);
});
