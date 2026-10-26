/**
 * /messages — MESSAGERI - المراسلات
 * Branded MESSAGERI. Limited to public chat, groups, and messaging legends and
 * non-private citizens. This is NOT AMIS; it does not embed Social or games.
 */
import { MessageSquare, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { installText, requestSectionInstall } from "@/lib/section-install";
import { dashboardText } from "@/i18n/dashboard-copy";
import { SOCIAL_T } from "@/components/social/social-i18n";
import Messenger from "@/components/messenger/Messenger";
import BusyCallRecovery from "@/components/messenger/BusyCallRecovery";
import Login from "@/pages/login";
import { MESSAGES_ENTRY_PATH } from "@/lib/messages-entry";

export default function MessagesPage() {
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const [, navigate] = useLocation();
  const search = useSearch();
  const st  = SOCIAL_T[lang] ?? SOCIAL_T.en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [installHelp, setInstallHelp] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState("");
  // FCM message clicks use the explicit roomId contract. Keep the existing
  // `room` alias for internal links created before background messaging.
  const params = new URLSearchParams(search);
  const requestedRoom = params.get("roomId") ?? params.get("room");
  const parsedRoomId = requestedRoom === null ? Number.NaN : Number(requestedRoom);
  const initialRoomId = Number.isSafeInteger(parsedRoomId) && parsedRoomId > 0 ? parsedRoomId : null;
  const hasInvalidRoomParam = requestedRoom !== null && initialRoomId === null;
  const setSelectedRoom = useCallback((roomId: number | null) => {
    navigate(roomId === null ? MESSAGES_ENTRY_PATH : `${MESSAGES_ENTRY_PATH}?room=${roomId}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (hasInvalidRoomParam) setSelectedRoom(null);
  }, [hasInvalidRoomParam, setSelectedRoom]);

  if (!user) {
    return <Login messagesEntry returnTo={`${MESSAGES_ENTRY_PATH}${window.location.search}${window.location.hash}`} />;
  }

  return (
    <div dir={dir} lang={lang === "de" ? "de-DE" : lang} className="mx-auto max-w-6xl px-3 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <MessageSquare className="size-5 text-primary" aria-hidden="true" />
        <h1 className="text-xl font-black text-foreground" data-testid="heading-messageri">Hm Messages</h1>
        <span className="text-xs text-muted-foreground">{st.messages}</span>
        <span className="ms-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3 text-primary" aria-hidden="true" /> {st.server_encrypted}
        </span>
        <Button variant="outline" size="sm" type="button" onClick={() => {
          setInstallHelp(null);
          void requestSectionInstall("messages", lang).then(setInstallHelp);
        }}>{installText(lang, "messagesButton")}</Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => {
          setLogoutError("");
          void logout().catch(error => setLogoutError(error instanceof Error ? error.message : "Logout failed"));
        }}>{dashboardText(lang, "logout")}</Button>
      </div>
      {installHelp && <p role="status" className="text-sm text-muted-foreground">{installHelp}</p>}
      {logoutError && <p role="alert" className="text-sm text-destructive">{logoutError}</p>}
      <BusyCallRecovery />
      <Messenger
        variant="full"
        initialRoomId={initialRoomId}
        onActiveRoomChange={setSelectedRoom}
      />
    </div>
  );
}
