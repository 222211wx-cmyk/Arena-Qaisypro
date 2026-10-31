import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {Router,Route,Switch,Redirect} from 'wouter';
import {AuthProvider,useAuth} from '@/contexts/AuthContext';
import Login from './login';
vi.mock('@/contexts/LangContext',()=>({useLang:()=>({lang:'en'})}));
vi.mock('@/lib/ameeq-light',()=>({clearAmeeq:async()=>{}}));
afterEach(()=>{cleanup();vi.restoreAllMocks();window.history.replaceState(null,'','/');});
function Account(){const {user,loading}=useAuth();return !loading&&!user?<Redirect to="/login"/>:<p>{user?'Verified account dashboard':'Loading account'}</p>;}
it('reaches the protected dashboard only after the real identity commits',async()=>{
 window.history.replaceState(null,'','/login?next=%2Fdashboard');
 let logged=false;
 vi.spyOn(globalThis,'fetch').mockImplementation(async(input)=>{
  if(String(input).endsWith('/login')){logged=true;return Response.json({id:'opaque-id',username:'Citizen'});}
  return logged?Response.json({id:'opaque-id',username:'Citizen'}):new Response('',{status:401});
 });
 render(<AuthProvider><Router><Switch><Route path="/login"><Login/></Route><Route path="/dashboard"><Account/></Route></Switch></Router></AuthProvider>);
 await act(async()=>{});
 fireEvent.change(screen.getByTestId('input-username'),{target:{value:'citizen@example.invalid'}});
 fireEvent.change(screen.getByTestId('input-password'),{target:{value:'test-password'}});
 fireEvent.click(screen.getByTestId('button-login'));
 await waitFor(()=>expect(screen.getByText('Verified account dashboard')).toBeTruthy());
 expect(window.location.pathname).toBe('/dashboard');
});
