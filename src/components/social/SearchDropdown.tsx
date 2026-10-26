/**
 * SearchDropdown — live search results: citizens, posts, hashtags
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Avatar from "./Avatar";
import { GOLD, GOLD_A, api } from "./social-i18n";
import type { SearchHit } from "./social-types";

interface Props {
  q: string;
  st: Record<string, string>;
  dir: string;
  onClose: () => void;
}

export default function SearchDropdown({ q, st, dir, onClose }: Props) {
  const [results, setResults] = useState<SearchHit | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(api(`/api/social/v2/search?q=${encodeURIComponent(q)}`));
        const j = await r.json();
        setResults(j);
      } finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  if (!q || q.length < 2) return null;

  const total = (results?.posts?.length ?? 0) + (results?.citizens?.length ?? 0) + (results?.stories?.length ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
        background: "hsl(var(--card))", border: `1px solid ${GOLD_A(0.13)}`, borderRadius: 10,
        zIndex: 1000, maxHeight: 420, overflowY: "auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.85)",
      }}>
      {loading && (
        <p style={{ padding: "14px 16px", color: "#ffffff40", margin: 0, fontSize: 13 }}>{st.searching}</p>
      )}
      {!loading && total === 0 && results !== null && (
        <p style={{ padding: "14px 16px", color: "hsl(var(--muted-foreground))", margin: 0, fontSize: 13 }}>
          {st.no_results_for} "{q}"
        </p>
      )}
      {!loading && results && total > 0 && (
        <>
          {results.citizens.length > 0 && (
            <div style={{ padding: "8px 0" }}>
              <p style={{ margin: "4px 12px 6px", fontSize: 10, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>
                {st.citizens}
              </p>
              {results.citizens.map(c => (
                <div key={c.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", cursor: "pointer", borderRadius: 6 }}
                  onClick={onClose}>
                  <Avatar name={c.username} size={28} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "hsl(var(--foreground))", fontSize: 13 }}>{c.username}</p>
                    <p style={{ margin: 0, fontSize: 11, color: c.rank.color }}>{c.rank.icon} {c.rank.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.posts.length > 0 && (
            <div style={{ padding: "8px 0", borderTop: results.citizens.length > 0 ? "1px solid #ffffff08" : "none" }}>
              <p style={{ margin: "4px 12px 6px", fontSize: 10, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>
                {st.feed}
              </p>
              {results.posts.map(p => (
                <div key={p.id}
                  style={{ padding: "7px 12px", cursor: "pointer" }}
                  onClick={onClose}>
                  <p style={{ margin: 0, fontWeight: 700, color: "hsl(var(--foreground))", fontSize: 12 }}>{p.username}</p>
                  <p style={{ margin: "2px 0 0", color: "hsl(var(--muted-foreground))", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir={dir}>
                    {p.content.slice(0, 80)}{p.content.length > 80 ? "…" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
          {results.stories.length > 0 && (
            <div style={{ padding: "8px 0", borderTop: "1px solid #ffffff08" }}>
              <p style={{ margin: "4px 12px 6px", fontSize: 10, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>
                {st.stories}
              </p>
              {results.stories.map(s => (
                <div key={s.id}
                  style={{ padding: "7px 12px", cursor: "pointer" }}
                  onClick={onClose}>
                  <p style={{ margin: 0, fontWeight: 700, color: "hsl(var(--foreground))", fontSize: 12 }}>{s.username}</p>
                  <p style={{ margin: "2px 0 0", color: "hsl(var(--muted-foreground))", fontSize: 12 }} dir={dir}>
                    {s.content.slice(0, 80)}{s.content.length > 80 ? "…" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
