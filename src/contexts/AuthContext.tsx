import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { readApiJson } from "@/lib/api-transport";

export interface AuthUser {
  id: number;
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
    if (!response.ok) throw new Error(`Authentication request failed (HTTP ${response.status}).`);
    return data;
  };
  const verifiedUser = (data: unknown): AuthUser | null => {
    if (data === null) return null;
    if (typeof data !== "object" || !("id" in data) || typeof data.id !== "number" ||
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
      if (token === generation.current) setAuthError(error instanceof Error ? error.message : "Session unavailable.");
    } finally {
      if (token === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    void refreshUser();
    return () => { generation.current += 1; };
  }, []);
  const authenticate = async (path: string, body: Record<string, unknown>) => {
    const token = ++generation.current;
    try {
      const next = verifiedUser(await request(path, body));
      if (token !== generation.current) throw new Error("Session changed; please retry.");
      if (!next) throw new Error("The backend did not return an authenticated session.");
      setUser(next); setAuthError(null); queryClient?.clear();
    } finally {
      if (token === generation.current) setLoading(false);
    }
  };
  const login = async (username: string, password: string, rememberMe = true) => authenticate("login", { username, password, rememberMe });
  const register = async (username: string, password: string, birthDate: string) => authenticate("register", { username, password, birthDate });
  const logout = async () => {
    const token = ++generation.current;
    await request("logout", {});
    if (token === generation.current) { setUser(null); setLoading(false); queryClient?.clear(); }
  };
  const changePassword = async (_currentPassword: string, _newPassword: string): Promise<string> => {
    throw new Error("Password changes require the authenticated Arena backend integration.");
  };
  const recoverAccess = async (_idToken: string, _returnTo: string) => {
    throw new Error("Account recovery requires the authenticated Arena backend integration.");
  };
  return <AuthContext.Provider value={{ user, loading, authError, login, register, changePassword, logout, refreshUser, recoverAccess, recoveryAccessPending: false }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
