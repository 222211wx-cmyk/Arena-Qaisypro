import { Component, type ReactNode } from "react";
import { useLang, type Lang } from "@/contexts/LangContext";
import { sharedCopy } from "@/i18n/shared-components-copy";

interface Props { children: ReactNode; lang: Lang }
interface State { hasError: boolean; message?: string }

/**
 * Global crash guard — one bad API response or render error must never
 * leave citizens staring at a black screen. Shows a gold recovery panel.
 */
class LocalizedErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Unknown render error" };
  }

  componentDidCatch(error: unknown) {
    console.error("[EMPIRE] Render crash caught by ErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      const { lang } = this.props;
      const copy = sharedCopy(lang).errorBoundary;
      return (
        <div dir={lang === "ar" ? "rtl" : "ltr"} style={{
          minHeight: "60vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "1rem",
          padding: "2rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem" }}>👑</div>
          <h2 style={{ color: "hsl(var(--primary))", fontSize: "1.4rem", fontWeight: 700 }}>
            {copy.title}
          </h2>
          <p style={{ color: "hsl(var(--muted-foreground))", maxWidth: 420 }}>
            {copy.text}
          </p>
          <pre role="alert" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: 600 }}>{this.state.message}</pre>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <a
              role="button"
              href={import.meta.env.BASE_URL}
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", padding: "0.6rem 1.4rem", borderRadius: 8, fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              {copy.retry}
            </a>
            <button
              onClick={() => { window.location.href = import.meta.env.BASE_URL; }}
              style={{ background: "transparent", color: "hsl(var(--primary))", padding: "0.6rem 1.4rem", borderRadius: 8, fontWeight: 700, border: "1px solid hsl(var(--primary))", cursor: "pointer" }}
            >
              {copy.home}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  return <LocalizedErrorBoundary lang={lang}>{children}</LocalizedErrorBoundary>;
}
