// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
// @ts-ignore JavaScript server module
import {createDurableClips,metadata,publicUrl,MAX_BYTES} from './durable-clips.js';
const user={id:'opaque-user',username:'Citizen'};
const key='clips/original/'+'a'.repeat(32)+'/11111111-1111-4111-8111-111111111111.mp4';
let query:any,send:any,sign:any,inspect:any,authenticate:any,fence:any,handler:any;
const upload={id:'11111111-1111-4111-8111-111111111111',user_id:user.id,object_key:key,title:'Title',original_name:'source.mp4',content_type:'video/mp4',size_bytes:'1000',state:'pending',clip_id:null,expires_at:new Date(Date.now()+600000)};
const clip={id:1000000000,code:'HELX-123456',user_id:user.id,username:user.username,title:'Title',original_name:'source.mp4',object_key:key,content_type:'video/mp4',size_bytes:'1000',duration_sec:68,created_at:new Date()};
function req(path='/api/clips/presign',body:any={filename:'source.mp4',title:'Title',contentType:'video/mp4',size:1000,expectedOwnerId:user.id},method='POST'){return {path,method,body,query:{},headers:{host:'arena.example',origin:'https://arena.example','content-type':'application/json'}};}
function res(){const r:any={statusCode:200,headers:{}};r.setHeader=(k:string,v:any)=>r.headers[k]=v;r.status=(c:number)=>{r.statusCode=c;return r;};r.json=(b:any)=>{r.body=b;return r;};r.redirect=(code:number,url:string)=>{r.statusCode=code;r.url=url;};return r;}
beforeEach(()=>{
 query=vi.fn(async(sql:string)=>{
  if(sql.startsWith('SELECT count'))return {rows:[{count:0}]};
  if(sql.includes('FROM vichy_clip_uploads'))return {rows:[{...upload}]};
  if(sql.startsWith('INSERT INTO vichy_clips'))return {rows:[{...clip}]};
  if(sql.includes('FROM vichy_clips')&&!sql.startsWith('SELECT 1'))return {rows:[{...clip}]};
  return {rows:[],rowCount:1};
 });
 const pool={query,connect:async()=>({query,release:vi.fn()})};
 send=vi.fn(async()=>({ContentLength:1000,Metadata:{upload:upload.id}}));
 sign=vi.fn(async()=> 'https://storage.example/signed');inspect=vi.fn(async()=>({duration:68,hasVideo:true}));
 authenticate=vi.fn(async()=>user);fence=vi.fn(async()=>true);
 handler=createDurableClips({pool:()=>pool,storage:()=>({bucket:'bucket',base:'https://media.example',client:{send,destroy:vi.fn()}}),sign,inspect,authenticate,fence,moderate:async()=>true});
});
it('registers the exact production presign path and grants direct storage only after durable session',async()=>{
 const r=res();await handler(req(),r,vi.fn());expect(r.statusCode).toBe(200);expect(r.body.url).toContain('https://');
 const insert=query.mock.calls.find(([sql]:any)=>sql.startsWith('INSERT INTO vichy_clip_uploads'))!;
 expect(insert[1][1]).toBe(user.id);expect(fence).toHaveBeenCalled();expect(sign).toHaveBeenCalled();expect(r.body.key).toMatch(/^clips\/original\/[a-f0-9]{32}\//);
});
it('also accepts /api/cli/upload JSON compatibility alias',async()=>{const r=res();await handler(req('/api/cli/upload'),r,vi.fn());expect(r.statusCode).toBe(200);});
it.each([0,MAX_BYTES+1,-1,1.5])('rejects invalid or oversized bytes %s without signing',async size=>{const r=res();await handler(req(undefined,{filename:'x.mp4',title:'x',contentType:'video/mp4',size}),r,vi.fn());expect(r.statusCode).toBe(400);expect(sign).not.toHaveBeenCalled();});
it('rejects owner substitution and foreign origin',async()=>{
 for(const kind of ['owner','origin']){const request=req();if(kind==='owner')request.body.expectedOwnerId='other';else request.headers.origin='https://foreign.example';const r=res();await handler(request,r,vi.fn());expect(r.statusCode).toBe(403);}
 expect(sign).not.toHaveBeenCalled();
});
it('fails before upload capability if database insert fails',async()=>{
 query.mockImplementation(async()=>{throw new Error('private DB details');});const r=res();await handler(req(),r,vi.fn());expect(r.statusCode).toBe(503);expect(sign).not.toHaveBeenCalled();expect(JSON.stringify(r.body)).not.toContain('private');
});
it('does not publish when storage has no original bytes',async()=>{
 send.mockRejectedValue({$metadata:{httpStatusCode:404}});const r=res();await handler(req('/api/clips/confirm',{key}),r,vi.fn());expect(r.statusCode).toBe(409);expect(inspect).not.toHaveBeenCalled();expect(query.mock.calls.some(([s]:any)=>s.startsWith('INSERT INTO vichy_clips'))).toBe(false);
});
it('checks object size and upload metadata, not browser duration',async()=>{
 send.mockResolvedValue({ContentLength:900,Metadata:{upload:upload.id}});const r=res();await handler(req('/api/clips/confirm',{key,durationSec:68}),r,vi.fn());expect(r.statusCode).toBe(409);expect(inspect).not.toHaveBeenCalled();
});
it('rejects fake or short media without durable publication',async()=>{
 inspect.mockRejectedValue(new Error('invalid'));const r=res();await handler(req('/api/clips/confirm',{key}),r,vi.fn());expect(r.statusCode).toBe(422);expect(query.mock.calls.some(([s]:any)=>s.startsWith('INSERT INTO vichy_clips'))).toBe(false);
});
it('publishes only after actual media probe and committed metadata',async()=>{
 const r=res();await handler(req('/api/clips/confirm',{key}),r,vi.fn());expect(r.statusCode).toBe(200);expect(r.body.ok).toBe(true);expect(r.body.clip.duration_sec).toBe(68);expect(r.body.clip.originalName).toBe('source.mp4');
 expect(query.mock.calls.some(([s]:any)=>s.startsWith('INSERT INTO vichy_clips'))).toBe(true);expect(query.mock.calls.at(-1)[0]).toBe('COMMIT');
});
it('idempotent confirm returns existing publication without reprobe',async()=>{
 const original=query.getMockImplementation();query.mockImplementation(async(sql:string,...args:any[])=>sql.includes('FROM vichy_clip_uploads')?{rows:[{...upload,clip_id:clip.id}]}:original(sql,...args));
 const r=res();await handler(req('/api/clips/confirm',{key}),r,vi.fn());expect(r.statusCode).toBe(200);expect(inspect).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
});
it('revoked session during inspection cannot publish',async()=>{
 fence.mockResolvedValue(false);const r=res();await handler(req('/api/clips/confirm',{key}),r,vi.fn());expect(r.statusCode).toBe(401);expect(query.mock.calls.some(([s]:any)=>s.startsWith('INSERT INTO vichy_clips'))).toBe(false);
});
it('feed returns real persisted playable URLs without invented rows',async()=>{
 const r=res();await handler(req('/api/clips/feed',undefined,'GET'),r,vi.fn());expect(r.statusCode).toBe(200);expect(r.body.clips).toHaveLength(1);expect(r.body.clips[0].video_url).toContain(key);expect(r.body.clips[0].user_id).toBe(user.id);
});
it('preserves missing-table error rather than returning empty success',async()=>{
 query.mockRejectedValue({code:'42P01'});const r=res();await handler(req('/api/clips/feed',undefined,'GET'),r,vi.fn());expect(r.statusCode).toBe(503);expect(r.body.clips).toBeUndefined();
});
it('requires safe public object URLs and real audio/video metadata',()=>{
 expect(()=>publicUrl('../secret','https://media.example')).toThrow();expect(metadata({filename:'x.html',title:'x',contentType:'text/html',size:10})).toBeNull();
});
