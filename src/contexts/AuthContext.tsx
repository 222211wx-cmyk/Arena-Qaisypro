import { createContext, useContext, useState, useEffect, useRef, Fragment, type ReactNode } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { apiPath } from "@/lib/network";
import { trackEvent } from "@/lib/analytics";
import { PUSH_LOGOUT_EVENT } from "@/lib/call-firebase";
import { announceAccountChange, subscribeAccountChanges, subscribeSessionWake } from "@/lib/account-session-events";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { useLang, type Lang } from "@/contexts/LangContext";
import { recoveryRequest } from "@/lib/phone-recovery";
import { recoveryReturnPath } from "@/lib/recovery-links";

const sessionCopy: Record<Lang, { checking: string; unavailable: string; retry: string }> = {
  ar: { checking: "جارٍ التحقق من جلستك…", unavailable: "تعذّر التحقق من جلستك الآن. حاول مرة أخرى.", retry: "إعادة المحاولة" },
  en: { checking: "Checking your session…", unavailable: "Unable to verify your session right now. Please retry.", retry: "Retry" },
  fr: { checking: "Vérification de votre session…", unavailable: "Impossible de vérifier votre session actuellement. Réessayez.", retry: "Réessayer" },
  es: { checking: "Verificando tu sesión…", unavailable: "No se pudo verificar tu sesión. Inténtalo de nuevo.", retry: "Reintentar" },
  de: { checking: "Sitzung wird überprüft…", unavailable: "Deine Sitzung kann gerade nicht überprüft werden. Bitte versuche es erneut.", retry: "Erneut versuchen" },
};

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useContext(QueryClientContext);
  const { lang } = useLang();
  const copy = sessionCopy[lang];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const [initialVerified, setInitialVerified] = useState(false);
  const [recoveryAccessPending, setRecoveryAccessPending] = useState(false);
  const authError = authUnavailable ? copy.unavailable : null;
  const authGenerationRef = useRef(0);
  const authRequestRef = useRef<AbortController | null>(null);
  const verifiedIdRef = useRef<number | null | undefined>(undefined);
  const refreshFlightRef = useRef<Promise<void> | null>(null);
  const mutationsRef = useRef(0);
  const verificationNeededRef = useRef(false);
  const externalChangeRef = useRef(false);
  // Keep committed recovery separate from the single-use SMS proof. A failed
  // /me check can be retried (including session-wake retries) without another SMS.
  const recoveryDestinationRef = useRef<string | null>(null);

  const acceptUser = (next: AuthUser | null, announce: boolean, force = false) => {
    const id = next?.id ?? null;
    const previous = verifiedIdRef.current;
    if (previous !== undefined && previous !== id) queryClient?.clear();
    verifiedIdRef.current = id;
    setUser(next);
    if (announce && (force || previous !== undefined && previous !== id)) announceAccountChange(id);
  };

  const validUser = (data: AuthUser): AuthUser => {
    if (!data || !Number.isSafeInteger(data.id) || data.id <= 0 || typeof data.username !== "string") {
      throw new Error("Invalid session response — please retry");
    }
    return data;
  };

  const beginAuthRequest = (clearCurrentUser = false) => {
    authRequestRef.current?.abort();
    const controller = new AbortController();
    authRequestRef.current = controller;
    refreshFlightRef.current = null;
    const generation = ++authGenerationRef.current;
    if (clearCurrentUser) setUser(null);
    return { controller, generation };
  };

  const verifyUser = async (announce: boolean) => {
    const { controller, generation } = beginAuthRequest();
    if (recoveryDestinationRef.current) setLoading(true);
    try {
      const res = await fetch(apiPath("/api/auth/me"), {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      if (generation !== authGenerationRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (generation === authGenerationRef.current) {
          acceptUser(validUser(data), announce);
          externalChangeRef.current = false;
          setAuthUnavailable(false);
          setInitialVerified(true);
          if (recoveryDestinationRef.current) {
            const destination = recoveryDestinationRef.current;
            recoveryDestinationRef.current = null;
            setRecoveryAccessPending(false);
            window.location.assign(`${import.meta.env.BASE_URL.replace(/\/$/, "")}${destination}`);
          }
        }
      } else if (res.status === 401) {
        if (recoveryDestinationRef.current) {
          // A committed access response must not return the user to SMS when
          // its new cookie cannot yet be verified.
          setAuthUnavailable(true);
          return;
        }
        acceptUser(null, announce);
        externalChangeRef.current = false;
        setAuthUnavailable(false);
        setInitialVerified(true);
      } else {
        // A gateway error, rate limit, or outage is not a revoked cookie.
        setAuthUnavailable(true);
      }
    } catch (error) {
      if (generation === authGenerationRef.current && !controller.signal.aborted) {
        setAuthUnavailable(true);
      }
    } finally {
      if (generation === authGenerationRef.current) setLoading(false);
    }
  };

  const refreshUser = (): Promise<void> => {
    if (mutationsRef.current > 0) {
      verificationNeededRef.current = true;
      return Promise.resolve();
    }
    if (refreshFlightRef.current) return refreshFlightRef.current;
    const flight = verifyUser(!externalChangeRef.current).finally(() => {
      if (refreshFlightRef.current === flight) refreshFlightRef.current = null;
    });
    refreshFlightRef.current = flight;
    return flight;
  };

  useEffect(() => {
    void refreshUser();
    const stopAccount = subscribeAccountChanges(() => {
      externalChangeRef.current = true;
      ++authGenerationRef.current;
      if (mutationsRef.current === 0) authRequestRef.current?.abort();
      refreshFlightRef.current = null;
      // Do not leave old-account private views interactive during verification.
      setUser(null);
      setInitialVerified(false);
      setLoading(true);
      void refreshUser();
    });
    const stopWake = subscribeSessionWake(() => void refreshUser());
    return () => {
      ++authGenerationRef.current;
      authRequestRef.current?.abort();
      stopAccount();
      stopWake();
    };
  }, []);

  const performLogin = async (username: string, password: string, rememberMe = true) => {
    recoveryDestinationRef.current = null;
    setRecoveryAccessPending(false);
    const { controller, generation } = beginAuthRequest();
    const res = await fetch(apiPath("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: username.trim(), password, rememberMe }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    if (generation === authGenerationRef.current) {
      trackEvent("auth_login_success", { method: "password" });
      acceptUser(validUser(data), true, true);
      externalChangeRef.current = false;
      setAuthUnavailable(false);
      setInitialVerified(true);
      setLoading(false);
    }
  };

  const performRegister = async (username: string, password: string, birthDate: string) => {
    recoveryDestinationRef.current = null;
    setRecoveryAccessPending(false);
    const { controller, generation } = beginAuthRequest();
    const res = await fetch(apiPath("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: username.trim(), password, birthDate }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Registration failed");
    // Simple flow: registered = logged in immediately
    if (generation === authGenerationRef.current) {
      trackEvent("auth_register_success", { method: "password" });
      acceptUser(validUser(data), true, true);
      externalChangeRef.current = false;
      setAuthUnavailable(false);
      setInitialVerified(true);
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch(apiPath("/api/auth/change-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Change password failed");
    announceAccountChange();
    return data.message as string;
  };

  const performLogout = async () => {
    recoveryDestinationRef.current = null;
    setRecoveryAccessPending(false);
    // Do not clear identity-bound surfaces until the server confirms logout;
    // callers must never report a successful logout while the session remains
    // alive.
    // Keep the user mounted until the server confirms the logout. This lets
    // the push hook revoke the active FCM installation only for a real logout,
    // rather than for an unmount caused by a failed request.
    const { controller, generation } = beginAuthRequest(false);
    const res = await fetch(apiPath("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Logout failed" }));
      throw new Error(data.error ?? "Logout failed");
    }
    if (generation !== authGenerationRef.current) return;
    window.dispatchEvent(new Event(PUSH_LOGOUT_EVENT));
    acceptUser(null, true, true);
    externalChangeRef.current = false;
    setAuthUnavailable(false);
    setInitialVerified(true);
    setLoading(false);
  };

  // Serialize cookie writers; aborted fetches cannot undo server-side cookies.
  const mutationTailRef = useRef<Promise<void>>(Promise.resolve());
  const mutate = (operation: () => Promise<void>): Promise<void> => {
    mutationsRef.current++;
    const result = mutationTailRef.current.then(operation).catch(error => {
      // A lost response can still have changed the cookie on the server.
      verificationNeededRef.current = true;
      throw error;
    }).finally(() => {
      mutationsRef.current--;
      if (mutationsRef.current === 0 && verificationNeededRef.current) {
        verificationNeededRef.current = false;
        void refreshUser();
      }
    });
    mutationTailRef.current = result.catch(() => {});
    return result;
  };
  const login = (username: string, password: string, rememberMe = true) =>
    mutate(() => performLogin(username, password, rememberMe));
  const register = (username: string, password: string, birthDate: string) =>
    mutate(() => performRegister(username, password, birthDate));
  const logout = () => mutate(performLogout);
  const recoverAccess = (idToken: string, returnTo: string) => mutate(async () => {
    // Serialize this cookie writer with login/logout and retire any /me request
    // for the old cookie before posting. Wake events queue verification while
    // the mutation is in flight instead of racing the new session.
    beginAuthRequest(true);
    const result = await recoveryRequest<{ success: boolean }>("access", { idToken });
    if (result.success !== true) throw new Error("Invalid recovery response");
    announceAccountChange();
    // Do not accept an identity here, including if an external invalidation
    // advanced the generation during POST. The fresh /me check below owns
    // identity acceptance and redirect under its own generation guard.
    recoveryDestinationRef.current = recoveryReturnPath(`next=${encodeURIComponent(returnTo)}`) ?? "/social";
    setRecoveryAccessPending(true);
    externalChangeRef.current = false;
    verificationNeededRef.current = true;
  });

  // All sections wait for the authoritative cookie check. On a transient
  // failure with no verified identity, never render guest/login redirects.
  if (!initialVerified) {
    return (
      <AuthContext.Provider value={{ user, loading, authError, login, register, changePassword, logout, refreshUser, recoverAccess, recoveryAccessPending }}>
        <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground" role="status">
          {loading ? (
            <p>{copy.checking}</p>
          ) : (
            <>
              <p role="alert">{authError}</p>
              <Button type="button" onClick={() => void refreshUser()}>{copy.retry}</Button>
            </>
          )}
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, register, changePassword, logout, refreshUser, recoverAccess, recoveryAccessPending }}>
      {authError && (
        <div dir={lang === "ar" ? "rtl" : "ltr"} role="alert" className="flex items-center justify-center gap-3 border-b border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-foreground">
          <span>{authError}</span>
          <Button type="button" variant="outline" onClick={() => void refreshUser()}>{copy.retry}</Button>
        </div>
      )}
      <Fragment key={user?.id ?? "anonymous"}>{children}</Fragment>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
