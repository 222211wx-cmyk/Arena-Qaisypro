import { createContext, useContext, useState, type ReactNode } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { getDemoUser, saveDemoUser, resetDemoUser } from "@/lib/mockData";

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

/** Local demo identity only: never checks, creates, or authenticates a server session. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useContext(QueryClientContext);
  const [user, setUser] = useState<AuthUser>(() => getDemoUser());
  const refreshUser = async () => { setUser(getDemoUser()); };
  const chooseDemoName = async (username: string) => {
    setUser(saveDemoUser({ ...getDemoUser(), username: username.trim() || "Guest", name: username.trim() || "Guest" }));
    queryClient?.clear();
  };
  const login = async (username: string, _password: string) => chooseDemoName(username);
  const register = async (username: string, _password: string, _birthDate: string) => chooseDemoName(username);
  const logout = async () => { setUser(resetDemoUser()); queryClient?.clear(); };
  const changePassword = async (_currentPassword: string, _newPassword: string): Promise<string> => {
    throw new Error("Demo accounts have no passwords. No credentials are stored or changed.");
  };
  const recoverAccess = async (_idToken: string, _returnTo: string) => {
    throw new Error("Account recovery is unavailable in local demo mode.");
  };
  return <AuthContext.Provider value={{ user, loading: false, authError: null, login, register, changePassword, logout, refreshUser, recoverAccess, recoveryAccessPending: false }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
