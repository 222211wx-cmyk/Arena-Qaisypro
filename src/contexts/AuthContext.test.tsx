import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
let state: ReturnType<typeof useAuth>;
function Reader() {
  state = useAuth();
  return <span>{state.user?.username ?? "Full Arena guest"}</span>;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("verified identity without blocking the full shell", () => {
  it("renders the shell on backend failure without creating a fake Guest identity", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<AuthProvider><Reader /></AuthProvider>);
    expect(screen.getByText("Full Arena guest")).toBeTruthy();
    await waitFor(() => expect(state.loading).toBe(false));
    expect(state.user).toBeNull();
    expect(state.authError).toBe("offline");
  });
  it("does not authenticate rejected credentials or persist them locally", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"error":"unauthorized"}', { status: 401 }));
    render(<AuthProvider><Reader /></AuthProvider>);
    await waitFor(() => expect(state.loading).toBe(false));
    await act(async () => { await expect(state.login("Player", "never-store-me")).rejects.toThrow("HTTP 401"); });
    expect(state.user).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain("never-store-me");
  });
  it("uses only the identity returned by the backend", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ id: 7, username: "Citizen" }));
    render(<AuthProvider><Reader /></AuthProvider>);
    await waitFor(() => expect(state.user?.id).toBe(7));
    expect(screen.getByText("Citizen")).toBeTruthy();
  });
});
it('broadcasts login/logout hints without leaking passwords or tokens',async()=>{
 const post=vi.fn();const Original=globalThis.BroadcastChannel;
 vi.stubGlobal('BroadcastChannel',class {onmessage:any;postMessage=post;close(){} });
 let logged=false;
 vi.spyOn(globalThis,'fetch').mockImplementation(async(input,init)=>{
  const path=String(input);if(path.endsWith('/login')){logged=true;return Response.json({id:7,username:'Citizen'});}
  if(path.endsWith('/logout')){logged=false;return Response.json({success:true});}
  return logged?Response.json({id:7,username:'Citizen'}):new Response('',{status:401});
 });
 render(<AuthProvider><Reader/></AuthProvider>);await waitFor(()=>expect(state.loading).toBe(false));
 await act(async()=>{await state.login('Citizen','never-store-me');});expect(state.user?.id).toBe(7);
 expect(post).toHaveBeenCalledWith(expect.objectContaining({type:'account-change'}));expect(JSON.stringify(post.mock.calls)).not.toMatch(/never-store-me|token|username/);
 await act(async()=>{await state.logout();});expect(state.user).toBeNull();
 vi.stubGlobal('BroadcastChannel',Original);
});
it('uses consumed recovery proof once and keeps pending cookie verification recoverable',async()=>{
 const calls:string[]=[];let recovered=false;
 vi.spyOn(globalThis,'fetch').mockImplementation(async(input,init)=>{
  const path=String(input);calls.push(path);
  if(path.endsWith('/recovery/access')){recovered=true;expect(JSON.parse(init!.body as string)).toEqual({idToken:'test-proof'});return Response.json({success:true});}
  return recovered?Response.json({id:8,username:'Recovered'}):new Response('',{status:401});
 });
 render(<AuthProvider><Reader/></AuthProvider>);await waitFor(()=>expect(state.loading).toBe(false));
 await act(async()=>{await state.recoverAccess('test-proof','/social');});
 expect(state.user?.id).toBe(8);expect(state.recoveryAccessPending).toBe(true);expect(calls.filter(p=>p.endsWith('/recovery/access'))).toHaveLength(1);
 expect(JSON.stringify(localStorage)).not.toContain('test-proof');
});
it('revalidates the cookie after an external tab event instead of trusting the message identity',async()=>{
 let receiver:any;const Original=globalThis.BroadcastChannel;
 vi.stubGlobal('BroadcastChannel',class {onmessage:any;constructor(){receiver=this;}postMessage(){}close(){} });
 let logged=false;const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>logged?Response.json({id:12,username:'ServerIdentity'}):new Response('',{status:401}));
 render(<AuthProvider><Reader/></AuthProvider>);await waitFor(()=>expect(state.loading).toBe(false));
 logged=true;await act(async()=>{receiver.onmessage({data:{type:'account-change',eventId:'external-test',user:{id:999,username:'Spoof'}}});await new Promise(r=>setTimeout(r,120));});
 expect(fetch).toHaveBeenCalledTimes(2);expect(state.user?.id).toBe(12);expect(state.user?.username).toBe('ServerIdentity');
 vi.stubGlobal('BroadcastChannel',Original);
});
it('keeps a verified text identity unchanged and never authenticates localStorage JSON',async()=>{
 localStorage.setItem('gdna_session',JSON.stringify({id:'forged',username:'Forged'}));
 vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({id:'opaque-real-id',username:'RealCitizen'}));
 render(<AuthProvider><Reader/></AuthProvider>);
 await waitFor(()=>expect(state.user?.id).toBe('opaque-real-id'));
 expect(state.user?.username).toBe('RealCitizen');
 localStorage.removeItem('gdna_session');
});
it('retires only known fake auth caches while preserving unrelated user data',async()=>{
 for(const key of ['gdna_users','gdna_session','gdna_device','arena:demo:session:v1'])localStorage.setItem(key,'stale');
 localStorage.setItem('keep-my-drafts','draft');
 vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('',{status:401}));
 render(<AuthProvider><Reader/></AuthProvider>);await waitFor(()=>expect(state.loading).toBe(false));
 for(const key of ['gdna_users','gdna_session','gdna_device','arena:demo:session:v1'])expect(localStorage.getItem(key)).toBeNull();
 expect(localStorage.getItem('keep-my-drafts')).toBe('draft');localStorage.removeItem('keep-my-drafts');
 expect(state.user).toBeNull();
});

it('does not accept malformed successful session responses as authenticated citizens',async()=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({success:true}));
 render(<AuthProvider><Reader/></AuthProvider>);
 await waitFor(()=>expect(state.loading).toBe(false));
 expect(state.user).toBeNull();expect(state.authError).toContain('Invalid authenticated session');
 expect(screen.getByText('Full Arena guest')).toBeTruthy();
});
