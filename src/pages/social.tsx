/**
 * Social Hub — thin shell
 * All feature logic lives in src/components/social/
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import SmartDomainWidget from "@/components/SmartDomainWidget";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Globe, MessageSquare, BookOpen, Radio, Users, Bell, Search, X } from "lucide-react";
import { useAuth }     from "../contexts/AuthContext";
import { useLang }     from "../contexts/LangContext";
import CommunicationMatrix from "../components/social/CommunicationMatrix";
import FeedTab          from "../components/social/FeedTab";
import MessagesTab      from "../components/social/MessagesTab";
import StoriesRow       from "../components/social/StoriesRow";
import LiveTab          from "../components/social/LiveTab";
import CitizensTab      from "../components/social/CitizensTab";
import NotificationsTab from "../components/social/NotificationsTab";
import SearchDropdown   from "../components/social/SearchDropdown";
import { SOCIAL_T, GOLD, GOLD_A } from "../components/social/social-i18n";
import { localeForLang } from "@/i18n/locale-surfaces-a-copy";
import { useBackLayer } from "@/lib/back-navigation";

type Tab = "overview" | "feed" | "messages" | "stories" | "live" | "citizens" | "notifications";

export default function SocialPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [, navigate] = useLocation();
  const st  = SOCIAL_T[lang] ?? SOCIAL_T.en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const locale = localeForLang(lang);

  const [tab,        setTab]        = useState<Tab>("overview");
  const [searchQ,    setSearchQ]    = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  useBackLayer(searchOpen || !!searchQ, () => { setSearchOpen(false); setSearchQ(""); }, 10, () => { setSearchOpen(searchOpen); setSearchQ(searchQ); });
  useBackLayer(tab !== "overview", () => setTab("overview"), 1, () => setTab(tab));
  const searchRef = useRef<HTMLDivElement>(null);

  // Submit the header search to the full /search page while retaining the live dropdown.
  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = searchQ.trim();
    setSearchOpen(false);
    if (!q) { navigate("/search"); return; }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  // Close search on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "overview",      icon: <LayoutGrid     size={14} />, label: st.overview },
    { id: "feed",          icon: <Globe          size={14} />, label: st.feed          },
    { id: "messages",      icon: <MessageSquare  size={14} />, label: st.messages      },
    { id: "stories",       icon: <BookOpen       size={14} />, label: st.stories       },
    { id: "live",          icon: <Radio          size={14} />, label: st.live          },
    { id: "citizens",      icon: <Users          size={14} />, label: st.citizens      },
    { id: "notifications", icon: <Bell           size={14} />, label: st.notifications },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        minHeight: "100vh",
        overflowX: "hidden",
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        paddingBottom: 80,
      }}
      dir={dir}
    >
      {/* Sticky header */}
      <div style={{ background: "hsl(var(--background) / 0.96)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${GOLD_A(0.08)}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "12px 16px" }}>
          {/* Title row + Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ flexShrink: 0 }}>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>
                <span style={{ color: GOLD }}>◈</span> {st.title}
              </h1>
              {user && (
                <p style={{ margin: 0, fontSize: 11, color: "#ffffff40" }}>
                  {user.username} · {(user.xp ?? 0).toLocaleString(locale)} XP
                </p>
              )}
            </div>
            {/* Global search */}
            <div ref={searchRef} style={{ flex: 1, position: "relative" }}>
              <form onSubmit={submitSearch} role="search" style={{
                display: "flex", alignItems: "center",
                background: "hsl(var(--card))", border: `1px solid ${searchOpen ? GOLD : GOLD_A(0.13)}`,
                borderRadius: 20, padding: "7px 14px", gap: 8, transition: "border-color 0.2s",
              }}>
                <button type="submit" aria-label={st.search_results}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 0, display: "flex", flexShrink: 0 }}
                  data-testid="button-search-submit">
                  <Search size={13} />
                </button>
                <input
                  value={searchQ}
                  onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder={st.search_placeholder}
                  aria-label={st.search_placeholder}
                  style={{ flex: 1, background: "none", border: "none", color: "hsl(var(--foreground))", fontSize: 13, outline: "none", minWidth: 0 }}
                  data-testid="input-search"
                />
                {searchQ && (
                  <button type="button" onClick={() => { setSearchQ(""); setSearchOpen(false); }}
                    aria-label={st.clear}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 0, display: "flex" }}
                    data-testid="button-search-clear">
                    <X size={13} />
                  </button>
                )}
              </form>
              {searchOpen && searchQ.length >= 2 && (
                <SearchDropdown
                  q={searchQ} st={st} dir={dir}
                  onClose={() => { setSearchOpen(false); setSearchQ(""); }}
                />
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div
            className="scrollbar-hide"
            style={{
              display: "flex",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              gap: 2,
              overflowX: "auto",
              overscrollBehaviorX: "contain",
            }}
          >
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 13px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", transition: "all 0.2s",
                  background: tab === t.id ? GOLD_A(0.13) : "transparent",
                  color:      tab === t.id ? GOLD : "#ffffff45",
                  borderBottom: tab === t.id ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Domain Widget */}
      <div style={{ maxWidth: 880, margin: "12px auto 0", padding: "0 16px" }}>
        <SmartDomainWidget domainId="social" label={st.module_social} />
      </div>

      {user && typeof user.id === "string" && <p role="status" style={{padding:"16px"}}>Some legacy social features require a compatible account schema. Your signed-in account ID is preserved.</p>}
      {/* Tab content */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "20px 16px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
            {tab === "overview"      && <CommunicationMatrix user={user && typeof user.id === "number" ? {...user,id:user.id} : null} st={st} dir={dir} />}
            {tab === "feed"          && <FeedTab          user={user && typeof user.id === "number" ? {...user,id:user.id} : null} st={st} dir={dir} />}
            {tab === "messages"      && <MessagesTab      user={user && typeof user.id === "number" ? {...user,id:user.id} : null} st={st} dir={dir} />}
            {tab === "stories"       && <StoriesRow       user={user && typeof user.id === "number" ? {...user,id:user.id} : null} st={st} dir={dir} />}
            {tab === "live"          && <LiveTab          user={user && typeof user.id === "number" ? {...user,id:user.id} : null} st={st} />}
            {tab === "citizens"      && <CitizensTab      user={user && typeof user.id === "number" ? {...user,id:user.id} : null} st={st} />}
            {tab === "notifications" && <NotificationsTab user={user && typeof user.id === "number" ? {...user,id:user.id} : null} st={st} dir={dir} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
