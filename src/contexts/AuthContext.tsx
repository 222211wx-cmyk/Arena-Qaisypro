import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { subscribeAccountChanges, announceAccountChange, subscribeSessionWake } from "@/lib/account-session-events";
import { clearAmeeq } from "@/lib/ameeq-light";
import { readApiJson } from "@/lib/api-transport";

export interface AuthUser {
  id: number | string;
  username: string;
  balance: number;
  xp: number;
  gamesPlayed: number;
  wins: number;
  canClaimDaily: boolean;
  isAdmin?: boolean;
  isAdult: boolean | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authError: string | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, password: string, birthDate: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  recoverAccess: (idToken: string, returnTo: string) => Promise<void>;
  recoveryAccessPending: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** The full shell renders even when the backend session is unavailable. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useContext(QueryClientContext);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryAccessPending,setRecoveryAccessPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const generation = useRef(0);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const request = async (path: string, body?: Record<string, unknown>) => {
    const response = await fetch(`${base}/api/auth/${path}`, {
      method: body ? "POST" : "GET", credentials: "include", cache: "no-store",
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (path === "me" && response.status === 401) return null;
    const data = await readApiJson(response);
    if (!response.ok) {
      const error = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'Authentication request failed.';
      throw new Error(`${error} (HTTP ${response.status})`);
    }
    return data;
  };
  const verifiedUser = (data: unknown): AuthUser | null => {
    if (data === null) return null;
    if (typeof data !== "object" || !("id" in data) || !(typeof data.id === "string" && data.id.length > 0 && data.id.length <= 256 || typeof data.id === "number" && Number.isSafeInteger(data.id) && data.id > 0) ||
        !("username" in data) || typeof data.username !== "string") {
      throw new Error("Invalid authenticated session response.");
    }
    return data as AuthUser;
  };
  const refreshUser = async () => {
    const token = ++generation.current;
    try {
      const next = verifiedUser(await request("me"));
      if (token === generation.current) { setUser(next); setAuthError(null); }
    } catch (error) {
      if (token === generation.current) { setUser(null); setAuthError(error instanceof Error ? error.message : "Session unavailable."); }
    } finally {
      if (token === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    // Retire the old fake client cache, including plaintext user passwords.
    // Never clear unrelated origin storage or trust a cached identity.
    try { for (const key of ['gdna_users','gdna_session','gdna_device']) localStorage.removeItem(key); } catch {}
    void refreshUser();
    return () => { generation.current += 1; };
  }, []);
  useEffect(()=>subscribeAccountChanges(()=>{queryClient?.clear();void refreshUser();}),[]);
  useEffect(()=>subscribeSessionWake(()=>{void refreshUser();}),[]);
  const authenticate = async (path: string, body: Record<string, unknown>) => {
    const token = ++generation.current;
    try {
      const next = verifiedUser(await request(path, body));
      if (token !== generation.current) throw new Error("Session changed; please retry.");
      if (!next) throw new Error("The backend did not return an authenticated session.");
      if(user?.id!==next.id){try{localStorage.removeItem('ameeq-offline-owner');await clearAmeeq();}catch{}}
      if(token!==generation.current)throw new Error('Session changed; please retry.');
      setUser(next); setAuthError(null);setRecoveryAccessPending(false); queryClient?.clear();announceAccountChange(next.id);
    } finally {
      if (token === generation.current) setLoading(false);
    }
  };
  const login = async (username: string, password: string, rememberMe = true) => authenticate("login", { username, password, rememberMe });
  const register = async (username: string, password: string, birthDate: string) => authenticate("register", { username, password, birthDate });
  const logout = async () => {
    const token = ++generation.current;
    try{localStorage.removeItem('ameeq-offline-owner');await clearAmeeq();}catch{}
    await request("logout", {});
    if (token === generation.current) { setUser(null);setRecoveryAccessPending(false); setLoading(false); queryClient?.clear();announceAccountChange(null); }
  };
  const changePassword = async (currentPassword: string, newPassword: string): Promise<string> => {
    const data = await request('change-password',{currentPassword,newPassword}) as {message?:string};
    announceAccountChange();await refreshUser();return data.message ?? 'Password changed.';
  };
  const recoverAccess = async (idToken: string, _returnTo: string) => {
    // The proof is consumed once on the server. Never replay it after a failed /me refresh.
    await request('recovery/access',{idToken});
    setRecoveryAccessPending(true);announceAccountChange();queryClient?.clear();
    await refreshUser();
  };
  return <AuthContext.Provider value={{ user, loading, authError, login, register, changePassword, logout, refreshUser, recoverAccess, recoveryAccessPending }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
