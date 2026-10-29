import { beforeEach, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { boundedSnapshot, clearAmeeq, languageOf, loadAmeeq, mapsLink, offlineAnswer, saveAmeeq } from './ameeq-light';
beforeEach(async()=>{await clearAmeeq();});
it('bounds data and strips unknown private fields',()=>{
 const value=boundedSnapshot({turns:Array.from({length:140},(_,i)=>({from:'user' as const,text:String(i),at:i})),clips:Array.from({length:30},(_,id)=>({id,title:'clip',username:'public',email:'secret'})),citizens:Array.from({length:15},()=>({username:'public',password_hash:'secret'}))});
 expect(value.turns).toHaveLength(100);expect(value.clips).toHaveLength(20);expect(value.citizens).toHaveLength(10);expect(JSON.stringify(value)).not.toContain('secret');
});
it('persists per-account and purges on logout',async()=>{
 const snapshot=boundedSnapshot({turns:[{from:'user',text:'private question',at:1}]});await saveAmeeq(41,snapshot);
 expect((await loadAmeeq(42)).turns).toEqual([]);expect((await loadAmeeq(41)).turns[0].text).toBe('private question');await clearAmeeq();expect((await loadAmeeq(41)).turns).toEqual([]);
});
it('does not resurrect pending saves after logout',async()=>{
 const pending=saveAmeeq(41,boundedSnapshot({turns:[{from:'user',text:'old',at:1}]}));await clearAmeeq();await pending;expect((await loadAmeeq(41)).turns).toEqual([]);
});
it('reuses exact saved answers with an explicit stale label, never inventing live counts',()=>{
 const snapshot=boundedSnapshot({turns:[{from:'user',text:'hi',at:1},{from:'ai',text:'There were 41 citizens',at:2}]});
 expect(offlineAnswer('hi',snapshot)).toContain('may be outdated');expect(offlineAnswer('new question',snapshot)).toContain('no AI model');expect(offlineAnswer('new question',snapshot)).not.toContain('41');
});
it('offers bounded support and medical caveats offline',()=>{
 const s=boundedSnapshot({});expect(offlineAnswer('مضغوط',s)).toContain('ماشي علاج');expect(offlineAnswer('medical report',s)).toContain('استشر طبيب مختص');expect(offlineAnswer('kill myself',s)).toContain('emergency');
});
it('language heuristic does not claim a particular dialect and map link encodes user input',()=>{
 expect(languageOf('ⴰⵣⵓⵍ')).toBe('zgh');expect(languageOf('bonjour')).toBe('fr');expect(languageOf('السلام')).toBe('ar');
 const url=new URL(mapsLink('Errachidia & Morocco'));expect(url.hostname).toBe('www.google.com');expect(url.searchParams.get('query')).toBe('Errachidia & Morocco');
});
