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
