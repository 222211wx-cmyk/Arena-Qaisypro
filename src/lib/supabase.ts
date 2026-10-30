import { createClient } from '@supabase/supabase-js';

// Optional public content client only. Database credentials never enter the
// browser. All account identity comes from the same-origin HttpOnly session.
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const content = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) : null;
export const isSupabaseConfigured = !!content;

async function authRequest(path: string, body?: Record<string, unknown>) {
  try {
    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
    const response = await fetch(`${base}/api/auth/${path}`, {
      method: body ? 'POST' : 'GET', credentials: 'include', cache: 'no-store',
      headers: { Accept: 'application/json', ...(body ? {'Content-Type':'application/json'} : {}) },
      ...(body ? {body:JSON.stringify(body)} : {}),
    });
    if (path === 'me' && response.status === 401) return { data:null, error:null };
    const data = await response.json();
    if (!response.ok) return {data:null,error:{message:typeof data.error === 'string' ? data.error : 'Authentication unavailable'}};
    return {data,error:null};
  } catch { return {data:null,error:{message:'Authentication unavailable; retry later'}}; }
}

export const supabase = {
  auth: {
    async signInWithPassword({email,password}: {email:string;password:string}) {
      const result = await authRequest('login',{email,password});
      return {data:result.data ? {user:result.data,session:{user:result.data}} : null,error:result.error};
    },
    async signUp({email,password,options}: {email:string;password:string;options?:{data?:{username?:string;birthDate?:string}}}) {
      const result = await authRequest('register',{email,password,username:options?.data?.username,birthDate:options?.data?.birthDate});
      return {data:result.data ? {user:result.data,session:{user:result.data}} : null,error:result.error};
    },
    async getSession() {
      const result = await authRequest('me');
      return {data:{session:result.data ? {user:result.data} : null},error:result.error};
    },
    async signOut() { const result=await authRequest('logout',{}); return {error:result.error}; },
    async resetPasswordForEmail(_email:string) {
      return {data:null,error:{message:'Use verified account recovery. No recovery email has been sent.'}};
    },
  },
  from(table:string) {
    if (!content) throw new Error('Public content service is not configured.');
    return content.from(table);
  },
};
export function requireSupabase() { return supabase; }
