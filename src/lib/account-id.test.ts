import {expect,it,vi,afterEach} from 'vitest';
import {isAccountId} from './account-id';
import {resolveIdentity} from '@/components/clips/reelsApi';
afterEach(()=>vi.restoreAllMocks());
it.each(['opaque-id','001',7])('preserves legitimate identity %s',id=>expect(isAccountId(id)).toBe(true));
it.each(['',' ',' id ',null,undefined,{},0,-1,1.5])('rejects malformed identity %s',id=>expect(isAccountId(id)).toBe(false));
it('recognizes a real text-ID session instead of reporting invalid/unknown',async()=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({id:'opaque-id',username:'Citizen'}));
 expect(await resolveIdentity()).toMatchObject({status:'authenticated',accountId:'opaque-id'});
});
it('never turns a 503 or malformed response into an anonymous or authenticated identity',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch');
 fetch.mockResolvedValueOnce(Response.json({error:'unavailable'},{status:503}));
 expect(await resolveIdentity()).toEqual({status:'unknown'});
 fetch.mockResolvedValueOnce(Response.json({id:{},username:'Citizen'}));
 expect(await resolveIdentity()).toEqual({status:'unknown'});
});
