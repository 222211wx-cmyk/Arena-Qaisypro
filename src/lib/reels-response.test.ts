import { expect,it,vi,afterEach } from 'vitest';
import { fetchFeed } from '@/components/clips/reelsApi';
import { citizenReturnPath } from './recovery-links';
afterEach(()=>vi.restoreAllMocks());
it('rejects malformed 200 responses instead of claiming no clips exist',async()=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:'upstream failed'}));
 await expect(fetchFeed({})).rejects.toThrow('Invalid clips feed response');
});
it('preserves real empty and degraded feed states',async()=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({clips:[],degraded:true}));
 expect((await fetchFeed({})).degraded).toBe(true);
});
it('allows section return paths and rejects external login redirects',()=>{
 expect(citizenReturnPath('?next=%2Fclips')).toBe('/clips');expect(citizenReturnPath('?next=%2Fcompetitions')).toBe('/competitions');
 for(const next of ['https://attacker.invalid','//attacker.invalid','/clips/../../login','/clips\\attacker'])expect(citizenReturnPath('?next='+encodeURIComponent(next))).toBeNull();
});
