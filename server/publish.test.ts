// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@neondatabase/serverless', () => ({ neon: () => query }));
// @ts-ignore JavaScript Vercel handler
import publish from '../api/clips/publish.js';
// @ts-ignore JavaScript Vercel handler
import missing from '../api/not-found.js';
const request = (body: unknown = { clipId: 42 }, method = 'POST') => ({ body, method, headers: { cookie: 'session=test', origin: 'https://arena.example', host: 'arena.example' } });
const response = () => { const res: any = { headers: {}, statusCode: 200, body: null }; res.setHeader = (k: string,v: string) => {res.headers[k] = v;}; res.status = (s: number) => {res.statusCode=s;return res;}; res.json = (v: unknown) => {res.body=v;return res;}; return res; };
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('VITE_API_URL','https://backend.example'); vi.stubEnv('DATABASE_URL','test'); vi.stubGlobal('fetch', vi.fn(async () => Response.json({ id: 7 }))); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('returns JSON 404 for missing API routes', () => {const res=response(); missing({},res); expect(res.statusCode).toBe(404);expect(res.headers['Content-Type']).toContain('application/json');});
it('rejects non-POST and malformed input without writes', async () => {for(const req of [request({},'GET'),request('{'),request({clipId:-1}),request({clipId:42,type:'other'})]){const res=response();await publish(req,res);expect(res.statusCode).toBeGreaterThanOrEqual(400);}expect(query).not.toHaveBeenCalled();});
it('fails closed without authentication/backend',async()=>{for(const kind of ['cookie','backend']){const req=request();if(kind==='cookie') req.headers.cookie='';else vi.stubEnv('VITE_API_URL','');const res=response();await publish(req,res);expect([401,503]).toContain(res.statusCode);}expect(query).not.toHaveBeenCalled();});
it('rejects a foreign origin',async()=>{const req=request();req.headers.origin='https://foreign.example';const res=response();await publish(req,res);expect(res.statusCode).toBe(403);expect(query).not.toHaveBeenCalled();});
it('enables flags only for verified identity and owned published clips',async()=>{query.mockResolvedValue([{id:42}]);const res=response();await publish(request(),res);expect(res.statusCode).toBe(200);expect(res.body).toMatchObject({features_enabled:true,tools_enabled:true});const [strings,...values]=query.mock.calls[0];expect(strings.join('')).toContain("AND status = 'published'");expect(strings.join('')).toContain('AND user_id =');expect(values).toEqual(['selfie',42,7]);});
it('rejects missing or unverified ownership',async()=>{query.mockResolvedValue([]);const res=response();await publish(request(),res);expect(res.statusCode).toBe(409);});
it('never returns HTML upstream errors',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response('<!DOCTYPE html>',{status:500})));const res=response();await publish(request(),res);expect(res.statusCode).toBe(503);expect(JSON.stringify(res.body)).not.toContain('<');expect(query).not.toHaveBeenCalled();});
it('routes API before SPA and retains numeric metadata mapping',()=>{const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));expect(config.rewrites.at(-2)).toEqual({source:'/api/:path*',destination:'/api/not-found'});expect(config.rewrites.at(-1).destination).toBe('/index.html');expect(config.rewrites[0].source).toBe('/api/clips/publish');});

it('returns JSON when the database schema is incompatible',async()=>{query.mockRejectedValue(new Error('column missing'));const res=response();await publish(request(),res);expect(res.statusCode).toBe(503);expect(res.headers['Content-Type']).toContain('application/json');expect(JSON.stringify(res.body)).not.toContain('column missing');});
