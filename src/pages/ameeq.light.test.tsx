import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import AmeeqPage from './ameeq';
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:41,username:'test'},loading:false})}));
vi.mock('@/contexts/LangContext',()=>({useLang:()=>({lang:'ar'})}));
vi.mock('@/components/social/social-i18n',()=>({api:(s:string)=>s}));
vi.mock('@/lib/account-session-events',()=>({subscribeAccountChanges:()=>()=>{}}));
beforeEach(()=>{HTMLElement.prototype.scrollTo=vi.fn();localStorage.clear();Object.defineProperty(navigator,'onLine',{value:true,configurable:true});vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({reports:[],response:'جواب متحقق'})})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('offers maps only by explicit click with a temporary-city disclaimer',async()=>{
 await act(async()=>{render(<AmeeqPage/>);});fireEvent.change(screen.getByLabelText('المكان على الخريطة'),{target:{value:'Errachidia'}});
 const link=screen.getByText('فتح المكان في Google Maps').closest('a')!;expect(new URL(link.href).searchParams.get('query')).toBe('Errachidia');
 expect(screen.getByText(/ماشي عنوان مقر مؤكد/)).toBeTruthy();expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('google'));
});
it('switches to bounded supportive offline replies without a network request',async()=>{
 await act(async()=>{render(<AmeeqPage/>);});await waitFor(()=>expect(screen.getByText(/متصل —/)).toBeTruthy());
 Object.defineProperty(navigator,'onLine',{value:false,configurable:true});fireEvent(window,new Event('offline'));
 const input=screen.getByPlaceholderText('اكتب أمرك هنا...');fireEvent.change(input,{target:{value:'مضغوط'}});fireEvent.click(screen.getByText('إرسال'));
 await waitFor(()=>expect(screen.getByText(/هادي مساعدة أولية ماشي علاج/)).toBeTruthy());
 expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('/api/ameeq'))).toBe(false);
});
it('does not enable device caching without explicit consent',async()=>{
 await act(async()=>{render(<AmeeqPage/>);});expect(localStorage.getItem('ameeq-offline-owner')).toBeNull();expect(screen.getByText('أوافق على الحفظ المحلي وتجهيز Offline')).toBeTruthy();
});
it('transcribes Moroccan Arabic and submits once to the existing API',async()=>{
 let recognition:any;
 class Speech {
   lang='';continuous=true;interimResults=true;onresult:any;onerror:any;onend:any;
   start=vi.fn();abort=vi.fn();constructor(){recognition=this;}
 }
 vi.stubGlobal('SpeechRecognition',Speech);
 await act(async()=>{render(<AmeeqPage/>);});
 expect(recognition).toBeUndefined();
 fireEvent.click(screen.getByRole('button',{name:'🎤 ميكروفون'}));
 expect(recognition.lang).toBe('ar-MA');expect(recognition.continuous).toBe(false);expect(recognition.start).toHaveBeenCalledOnce();
 await act(async()=>{recognition.onresult({results:[[{transcript:'شكون نتا'}]]});recognition.onresult({results:[[{transcript:'شكون نتا'}]]});});
 const calls=vi.mocked(fetch).mock.calls.filter(([url])=>String(url)==='/api/ameeq');
 expect(calls).toHaveLength(1);expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({command:'شكون نتا'});
 expect(screen.getByText('جواب متحقق')).toBeTruthy();
});
it('explains unsupported microphone and permission rejection without blocking typing',async()=>{
 await act(async()=>{render(<AmeeqPage/>);});
 fireEvent.click(screen.getByRole('button',{name:'🎤 ميكروفون'}));
 expect(screen.getAllByText(/التعرف الصوتي غير مدعوم/).length).toBeGreaterThan(0);
 fireEvent.change(screen.getByLabelText('سؤال Ameeq'),{target:{value:'مرحبا'}});
 fireEvent.click(screen.getByText('إرسال'));
 await waitFor(()=>expect(screen.getByText('جواب متحقق')).toBeTruthy());
});
it('loads actual public clip and citizen metadata on click, not invented counts',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(url)=>({ok:true,json:async()=>String(url).includes('/clips/feed')?{clips:[{id:13,title:'Real clip',username:'Citizen'}]}:String(url).includes('/citizens?')?{citizens:[{id:41,username:'Citizen'}]}:{reports:[]}})));
 await act(async()=>{render(<AmeeqPage/>);});
 fireEvent.click(document.getElementById('clip-btn')!);
 await waitFor(()=>expect(screen.getByText('Real clip').getAttribute('href')).toBe('/clips/13'));
 fireEvent.click(document.getElementById('citoyens-btn')!);
 await waitFor(()=>expect(screen.getByText('Citizen').getAttribute('href')).toBe('/u/Citizen'));
 for(const link of screen.getAllByRole('link',{name:'Compétitions ↗'})) expect(link.getAttribute('href')).toBe('/games');
});
it('handles permission denial and releases recognition on unmount',async()=>{
 let recognition:any;
 class Speech {lang='';continuous=false;interimResults=false;onresult:any;onerror:any;onend:any;start=vi.fn();abort=vi.fn();constructor(){recognition=this;}}
 vi.stubGlobal('SpeechRecognition',Speech);
 let view:ReturnType<typeof render>;
 await act(async()=>{view=render(<AmeeqPage/>);});
 fireEvent.click(screen.getByRole('button',{name:'🎤 ميكروفون'}));
 await act(async()=>{recognition.onerror({error:'not-allowed'});});
 expect(screen.getAllByText(/إذن الميكروفون مرفوض/).length).toBeGreaterThan(0);
 expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url)==='/api/ameeq')).toBe(false);
 view!.unmount();expect(recognition.abort).toHaveBeenCalledOnce();
});
