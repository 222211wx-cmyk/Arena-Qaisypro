import pg from 'pg';
import {randomUUID,randomInt,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import probe from '@ffprobe-installer/ffprobe';
import {S3Client,PutObjectCommand,HeadObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {authHandler,lockPublicationSession} from './auth.js';

const TYPES=new Map([['video/mp4','.mp4'],['video/webm','.webm'],['video/quicktime','.mov'],['audio/mpeg','.mp3'],['audio/mp4','.m4a'],['audio/wav','.wav'],['audio/x-wav','.wav'],['audio/ogg','.ogg'],['audio/webm','.webm']]);
let db;
let titleAllowed=async()=>false;
export function configurePublicationModeration(check){titleAllowed=check;}
function database(){if(!process.env.DATABASE_URL)throw new Error('Database unavailable');return db??=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:5000,statement_timeout:10000,idleTimeoutMillis:10000,allowExitOnIdle:true});}
export function config(env=process.env){
  const bucket=env.R2_BUCKET_NAME||env.R2_BUCKET;
  if(!bucket||!env.R2_ENDPOINT||!env.R2_ACCESS_KEY_ID||!env.R2_SECRET_ACCESS_KEY||!env.R2_PUBLIC_URL)throw new Error('Storage unavailable');
  const endpoint=new URL(env.R2_ENDPOINT),base=new URL(env.R2_PUBLIC_URL);
  if(endpoint.protocol!=='https:'||base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.hostname.endsWith('.r2.cloudflarestorage.com'))throw new Error('Invalid storage configuration');
  return {bucket,base:base.href.replace(/\/+$/,''),client:new S3Client({endpoint:endpoint.href,region:'auto',requestChecksumCalculation:'WHEN_REQUIRED',credentials:{accessKeyId:env.R2_ACCESS_KEY_ID,secretAccessKey:env.R2_SECRET_ACCESS_KEY},maxAttempts:2})};
}
export function metadata(body){
  const title=typeof body?.title==='string'?body.title.trim():'';
  const filename=typeof body?.filename==='string'?body.filename.trim():'';
  let type=typeof body?.contentType==='string'?body.contentType.toLowerCase().split(';')[0].trim():'';
  if(!type||type==='application/octet-stream'){
    const extension=filename.split('.').at(-1)?.toLowerCase();
    type=({mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4a:'audio/mp4',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg'})[extension]||'';
  }
  if(!title||title.length>200||/[\u0000-\u001f]/.test(title)||!filename||filename.length>1024||!TYPES.has(type)||!Number.isSafeInteger(body.size)||body.size<=0)return null;
  return {title,filename,type,size:body.size,extension:TYPES.get(type),uploadType:body.contentType||'application/octet-stream'};
}
export function publicUrl(key,base){if(!/^clips\/original\/[a-f0-9]{32}\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(key))throw new Error('Invalid object reference');return base+'/'+key.split('/').map(encodeURIComponent).join('/');}
export function inspectMedia(url){
  return new Promise((resolve,reject)=>{
    const child=spawn(probe.path,['-v','error','-rw_timeout','10000000','-protocol_whitelist','https,http,tls,tcp,crypto','-show_entries','format=duration,format_name:stream=codec_type,codec_name','-of','json',url],{stdio:['ignore','pipe','ignore']});
    let text='';let settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve(value);};
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Media inspection timed out'));},45000);
    child.stdout.on('data',chunk=>{text+=chunk;if(text.length>65536){child.kill('SIGKILL');finish(new Error('Invalid media'));}});
    child.on('error',()=>finish(new Error('Media inspection unavailable')));
    child.on('close',code=>{try{
      const data=JSON.parse(text),duration=Number(data.format?.duration);
      const formats=String(data.format?.format_name||'').split(',');
      // Containers that can reference other resources (playlists) are not publication media.
      if(code!==0||!Number.isFinite(duration)||duration<60||!formats.some(name=>['mov','mp4','m4a','matroska','webm','mp3','wav','ogg'].includes(name))||!data.streams?.some(stream=>['audio','video'].includes(stream.codec_type)&&stream.codec_name))throw new Error('Invalid media');
      finish(null,{duration,hasVideo:data.streams.some(stream=>stream.codec_type==='video')});
    }catch{finish(new Error('Media must be a playable audio/video file lasting at least one minute'));}});
  });
}
async function identity(req,res,optional=false){
  let user=null;
  const proxy={setHeader:(name,value)=>res.setHeader(name,value),status(code){this.statusCode=code;return this;},json(body){if(this.statusCode===200)user=body;else if(!optional) res.status(this.statusCode).json(body);},statusCode:200};
  // IncomingMessage.headers is a prototype getter, not a spreadable own field.
  await authHandler('me')({method:'GET',headers:req.headers,socket:req.socket},proxy);return user;
}
function writable(req){
  if(req.headers['sec-fetch-site']==='cross-site')return false;
  if((req.headers['content-type']||'').split(';')[0].toLowerCase()!=='application/json')return false;
  if(req.headers.origin){try{if(new URL(req.headers.origin).origin!==`https://${req.headers.host}`)return false;}catch{return false;}}
  return true;
}
async function transaction(pool,action){const client=await pool.connect();try{await client.query('BEGIN');const value=await action(client);await client.query('COMMIT');return value;}catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}}
export function clipRow(row,base){return {id:row.id,code:row.code,title:row.title,name:row.title,originalName:row.original_name,user_id:row.user_id,username:row.username,author:{id:row.user_id,username:row.username,avatarUrl:null},content_type:row.content_type,contentType:row.content_type,size:Number(row.size_bytes),size_bytes:Number(row.size_bytes),duration:Number(row.duration_sec),duration_sec:Number(row.duration_sec),created_at:row.created_at,processing_status:'ready',processingStatus:'ready',video_url:publicUrl(row.object_key,base),url:publicUrl(row.object_key,base),thumb:null,views:0,saveCount:0,shareCount:0,saved:false,liked:false,likeCount:0,commentCount:0};}

export function createDurableClips({pool=database,storage=config,sign=getSignedUrl,inspect=inspectMedia,authenticate=identity,fence=lockPublicationSession,moderate=title=>titleAllowed(title)}={}){
 return async function durableClips(req,res,next){
  const path=req.path;
  const presign=['/api/clips/presign','/api/cli/upload'].includes(path);
  const confirm=path==='/api/clips/confirm';
  const cancel=path==='/api/clips/cancel';
  const pendingList=path==='/api/clips/pending';
  const feed=['/api/clips/feed','/api/clips'].includes(path);
  const byCode=path.match(/^\/api\/clips\/by-code\/(HELX-\d{6})$/);
  const byId=path.match(/^\/api\/clips\/(\d+)(?:\/(engagement|by-code|video-url))?$/);
  const stream=path.match(/^\/api\/clips\/stream\/(\d+)(?:\/video.mp4)?$/);
  if(!presign&&!confirm&&!cancel&&!pendingList&&!feed&&!byCode&&!byId&&!stream)return next();
  // Keep the old API for legacy clip IDs. New durable publications use a reserved range.
  const id=Number(byId?.[1]||stream?.[1]);
  if((byId||stream)&&id<1000000000)return next();
  const deleting=!!byId&&!byId[2]&&req.method==='DELETE';
  if(!['GET','HEAD'].includes(req.method)&&!presign&&!confirm&&!cancel&&!pendingList&&!deleting)return next();
  res.setHeader('Cache-Control','no-store');
  let cfg;
  try{
    if((presign||confirm||cancel)&&req.method!=='POST')return res.status(405).json({error:'POST required'});
    if((presign||confirm||cancel||deleting)&&!writable(req))return res.status(403).json({error:'Same-origin JSON request required'});
    const database=pool();
    if(pendingList){
      if(req.method!=='GET')return res.status(405).json({error:'GET required'});
      const user=await authenticate(req,res);if(!user)return;
      const result=await database.query("SELECT object_key AS key FROM vichy_clip_uploads WHERE user_id=$1 AND state='pending' AND clip_id IS NULL AND expires_at>NOW() ORDER BY created_at LIMIT 10",[user.id]);
      return res.status(200).json({ownerId:user.id,uploads:result.rows});
    }
    if(presign||confirm||cancel||deleting){
      const user=await authenticate(req,res);if(!user)return;
      if(req.body?.expectedOwnerId!=null&&req.body.expectedOwnerId!==user.id)return res.status(403).json({error:'Account changed; select the file again'});
      cfg=storage();
      if(presign){
        const data=metadata(req.body);if(!data)return res.status(400).json({error:'Valid nonempty audio/video metadata and title are required'});
        if(!await moderate(data.title))return res.status(400).json({error:'Publication title rejected'});
        const uploadId=randomUUID(),owner=createHash('sha256').update(String(user.id)).digest('hex').slice(0,32);
        const key=`clips/original/${owner}/${uploadId}${data.extension}`;
        // Commit a durable owner session before granting upload capability; no pending-count quota.
        const url=await transaction(database,async client=>{
          if(!await fence(req,client,user.id))throw Object.assign(new Error('Session revoked'),{status:401});
          await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
          await client.query(`INSERT INTO vichy_clip_uploads(id,user_id,object_key,title,original_name,content_type,size_bytes,expires_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,NOW()+INTERVAL '1 hour')`,[uploadId,user.id,key,data.title,data.filename,data.type,data.size]);
          // Signing failure rolls back the pending row; no unusable slot is committed.
          return sign(cfg.client,new PutObjectCommand({Bucket:cfg.bucket,Key:key,ContentType:data.uploadType,ContentLength:data.size,IfNoneMatch:'*',Metadata:{upload:uploadId}}),{expiresIn:3600,signableHeaders:new Set(['content-type','content-length','if-none-match'])});
        });
        return res.status(200).json({url,key});
      }
      if(deleting){
        const found=await database.query('SELECT * FROM vichy_clips WHERE id=$1 AND user_id=$2',[id,user.id]);
        const row=found.rows[0];if(!row)return res.status(404).json({error:'Publication not found'});
        await cfg.client.send(new DeleteObjectCommand({Bucket:cfg.bucket,Key:row.object_key}));
        await transaction(database,async client=>{await client.query("UPDATE vichy_clip_uploads SET state='deleted',clip_id=NULL WHERE clip_id=$1 AND user_id=$2",[id,user.id]);await client.query('DELETE FROM vichy_clips WHERE id=$1 AND user_id=$2',[id,user.id]);});
        return res.status(200).json({ok:true});
      }
      const key=req.body?.key;
      if(typeof key!=='string'||key.length>300)return res.status(400).json({error:'Upload key required'});
      const found=await database.query('SELECT * FROM vichy_clip_uploads WHERE object_key=$1 AND user_id=$2',[key,user.id]);
      const upload=found.rows[0];if(!upload||upload.state==='deleted')return res.status(404).json({error:'Upload session not found'});
      if(cancel){
        if(upload.clip_id)return res.status(409).json({error:'Use publication delete for a published clip'});
        await transaction(database,async client=>{
          if(!await fence(req,client,user.id))throw Object.assign(new Error('Session revoked'),{status:401});
          const locked=await client.query('SELECT clip_id FROM vichy_clip_uploads WHERE id=$1 FOR UPDATE',[upload.id]);
          if(locked.rows[0]?.clip_id)throw new Error('Publication already confirmed');
          await cfg.client.send(new DeleteObjectCommand({Bucket:cfg.bucket,Key:key}));
          await client.query("UPDATE vichy_clip_uploads SET state='deleted' WHERE id=$1 AND user_id=$2",[upload.id,user.id]);
        });
        return res.status(200).json({ok:true});
      }
      if(upload.clip_id){const existing=await database.query('SELECT * FROM vichy_clips WHERE id=$1 AND user_id=$2',[upload.clip_id,user.id]);if(existing.rows[0])return res.status(200).json({ok:true,code:existing.rows[0].code,clip:clipRow(existing.rows[0],cfg.base)});}
      if(new Date(upload.expires_at).getTime()<=Date.now())return res.status(410).json({error:'Upload session expired; select the file again'});
      let head;
      try{head=await cfg.client.send(new HeadObjectCommand({Bucket:cfg.bucket,Key:key}));}catch(error){if(error?.$metadata?.httpStatusCode===404)return res.status(409).json({error:'Original file has not reached storage'});throw error;}
      if(Number(head.ContentLength)!==Number(upload.size_bytes)||head.Metadata?.upload!==upload.id)return res.status(409).json({error:'Stored file does not match this upload'});
      const readUrl=await sign(cfg.client,new GetObjectCommand({Bucket:cfg.bucket,Key:key}),{expiresIn:120});
      let media;
      try { media=await inspect(readUrl); } catch { return res.status(422).json({error:'Media verification failed. Use a playable audio/video file lasting at least one minute.'}); }
      const actualType=media.hasVideo?upload.content_type.startsWith('video/')?upload.content_type:'video/mp4':upload.content_type.startsWith('audio/')?upload.content_type:'audio/mp4';
      const published=await transaction(database,async client=>{
        if(!await fence(req,client,user.id))throw Object.assign(new Error('Session revoked'),{status:401});
        const current=await client.query('SELECT * FROM vichy_clip_uploads WHERE id=$1 AND user_id=$2 FOR UPDATE',[upload.id,user.id]);
        if(current.rows[0]?.clip_id){return (await client.query('SELECT * FROM vichy_clips WHERE id=$1',[current.rows[0].clip_id])).rows[0];}
        if(new Date(current.rows[0]?.expires_at).getTime()<=Date.now())throw new Error('Upload expired');
        if(current.rows[0]?.state!=='pending')throw new Error('Upload state changed');
        // Allocate HELX code under a short cross-instance lock; no duplicate publications.
        await client.query('SELECT pg_advisory_xact_lock(782341905)');
        let code;
        for(let i=0;i<20;i++){const candidate='HELX-'+String(randomInt(0,1000000)).padStart(6,'0');const exists=await client.query('SELECT 1 FROM vichy_clips WHERE code=$1',[candidate]);if(!exists.rows.length){code=candidate;break;}}
        if(!code)throw new Error('Publication code unavailable');
        const result=await client.query(`INSERT INTO vichy_clips(code,user_id,username,title,original_name,object_key,content_type,size_bytes,duration_sec)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[code,user.id,user.username,upload.title,upload.original_name,key,actualType,Number(upload.size_bytes),media.duration]);
        const row=result.rows[0];
        await client.query("UPDATE vichy_clip_uploads SET state='published',clip_id=$2 WHERE id=$1",[upload.id,row.id]);return row;
      });
      return res.status(200).json({ok:true,code:published.code,clip:clipRow(published,cfg.base)});
    }
    cfg=storage();
    if(feed){
      const limit=req.query.limit===undefined?5:Number(req.query.limit),before=req.query.before===undefined?null:Number(req.query.before),q=typeof req.query.q==='string'?req.query.q.trim():'';
      if(!Number.isSafeInteger(limit)||limit<1||limit>10||before!==null&&(!Number.isSafeInteger(before)||before<=0)||q.length>100)return res.status(400).json({error:'Invalid feed query'});
      const result=await database.query(`SELECT c.* FROM vichy_clips c JOIN users u ON u.id=c.user_id
        WHERE u.password_hash<>'DELETED' AND ($1::integer IS NULL OR c.id<$1) AND ($2='' OR c.title ILIKE '%'||$2||'%' OR c.username ILIKE '%'||$2||'%') ORDER BY c.id DESC LIMIT $3`,[before,q,limit+1]);
      const rows=result.rows.slice(0,limit).map(row=>clipRow(row,cfg.base)),hasMore=result.rows.length>limit;
      return res.status(200).json({clips:rows,hasMore,nextBefore:hasMore?rows.at(-1).id:null});
    }
    const result=await database.query(`SELECT c.* FROM vichy_clips c JOIN users u ON u.id=c.user_id WHERE u.password_hash<>'DELETED' AND ${byCode?'c.code=$1':'c.id=$1'}`,[byCode?.[1]||id]);
    const row=result.rows[0];if(!row){if(byCode)return next();return res.status(404).json({error:'Clip not found'});}
    if(stream)return res.redirect(307,publicUrl(row.object_key,cfg.base));
    const clip=clipRow(row,cfg.base);
    if(byId?.[2]==='engagement'){const viewer=await authenticate(req,res,true);return res.status(200).json({engagement:{...clip,isOwner:viewer?.id===row.user_id}});}
    if(byId?.[2]==='video-url')return res.status(200).json({url:clip.url});
    if(byId?.[2]==='by-code')return res.status(200).json({code:clip.code});
    return res.status(200).json(clip);
  }catch(error){
    console.error('Durable publication unavailable',{path,code:typeof error?.code==='string'?error.code:undefined,name:/^[A-Za-z0-9]+$/.test(error?.name??'')?error.name:undefined,httpStatus:error?.$metadata?.httpStatusCode,transportCode:error?.cause?.code});
    if(error?.status===401)return res.status(401).json({error:'Session revoked. Sign in again.'});
    return res.status(503).json({error:'Publication/storage verification unavailable. Nothing was reported as published.'});
  }finally{cfg?.client.destroy();}
 };
}
export const durableClipRoutes=createDurableClips();
