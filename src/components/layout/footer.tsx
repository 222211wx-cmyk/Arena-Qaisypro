import { Link } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { Crown, Shield, Globe, FileCheck, Lock, Cpu, ExternalLink } from "lucide-react";

const CERT_BADGES = [
  { code: "ISO 27001", color: "text-primary" },
  { code: "GDPR",      color: "text-primary" },
  { code: "SSL TLS",   color: "text-primary" },
  { code: "CCPA",      color: "text-primary" },
  { code: "OpenAI",    color: "text-primary" },
  { code: "W3C",       color: "text-primary" },
];

export function Footer() {
  const { t, lang } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-primary/10 bg-background/95">
      {/* Certification Strip */}
      <div className="border-b border-primary/10 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest shrink-0">
            {t("footer_certified")}:
          </span>
          {CERT_BADGES.map(b => (
            <span key={b.code} className={`text-xs font-mono font-bold px-2 py-0.5 rounded border border-current/20 bg-current/5 ${b.color}`}>
              ✓ {b.code}
            </span>
          ))}
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-black text-lg uppercase tracking-tighter neon-text-glow">{lang === "ar" ? "أرينا" : "ARENA"}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("footer_tagline")}</p>
            <div className="flex flex-wrap gap-1">
              {["🇸🇦", "🇬🇧", "🇫🇷", "🇲🇦", "🌍"].map(f => (
                <span key={f} className="text-base">{f}</span>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">{t("footer_platform")}</h4>
            <ul className="space-y-2">
              {[
                { label: t("hub"),         path: "/hub" },
                { label: t("games"),       path: "/games" },
                { label: "GlobalStar",     path: "/games/globalstar" },
                { label: t("leaderboard"), path: "/leaderboard" },
                { label: t("news"),        path: "/news" },
              ].map(l => (
                <li key={l.path}>
                  <Link href={l.path} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empire */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">{t("footer_empire")}</h4>
            <ul className="space-y-2">
              {[
                { label: t("empire_title"), path: "/empire" },
                { label: t("legal_tab_terms"),   path: "/legal" },
                { label: t("legal_tab_privacy"), path: "/legal" },
                { label: t("legal_tab_gdpr"),    path: "/legal" },
                { label: t("ai"),                path: "/chat" },
              ].map((l, i) => (
                <li key={i}>
                  <Link href={l.path} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">{t("footer_legal")}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3 h-3 text-primary" /> {t("footer_gdpr_compliant")}
              </li>
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="w-3 h-3 text-primary" /> SSL/TLS 1.3
              </li>
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cpu className="w-3 h-3 text-primary" /> {t("footer_ai_moderated")}
              </li>
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="w-3 h-3 text-primary" /> {t("footer_countries")}
              </li>
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileCheck className="w-3 h-3 text-primary" /> ISO 27001
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground font-mono">
            © {year} <span className="text-primary font-bold">{lang === "ar" ? "أرينا" : "ARENA"}</span> — {t("footer_rights")}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/legal" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              {t("legal_tab_terms")}
            </Link>
            <Link href="/legal" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              {t("legal_tab_privacy")}
            </Link>
            <Link href="/empire" className="text-xs text-primary hover:text-primary/80 font-bold uppercase tracking-wider transition-colors flex items-center gap-1">
              <Crown className="w-3 h-3" /> {t("empire_title")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
