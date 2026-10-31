import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useLang } from "@/contexts/LangContext";

function currentPage(area: HTMLElement, count: number) {
  if (area.scrollTop > 0 && area.scrollTop + area.clientHeight >= area.scrollHeight - 1) return count - 1;
  return Math.min(count - 1, Math.floor(area.scrollTop / Math.max(1, area.clientHeight)));
}

/** Paginate the existing page without replacing its content or leaving the site. */
export function BookReader({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [toc, setToc] = useState(false);
  const [headings, setHeadings] = useState<HTMLElement[]>([]);
  const [fullscreenError, setFullscreenError] = useState("");
  const shell = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const area = viewport.current!;
    area.scrollTop = 0;
    setPage(0);
    setToc(false);
  }, [location, open]);
  useEffect(() => {
    if (!open) return;
    const area = viewport.current!;
    const body = content.current!;
    const measure = () => {
      const count = Math.max(1, Math.ceil(area.scrollHeight / Math.max(1, area.clientHeight)));
      setPages(count);
      setPage(currentPage(area, count));
      setHeadings(Array.from(body.querySelectorAll<HTMLElement>("h1,h2,h3")));
    };
    measure();
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    resize?.observe(area);
    resize?.observe(body);
    const mutation = new MutationObserver(measure);
    mutation.observe(body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", measure);
    return () => { resize?.disconnect(); mutation.disconnect(); window.removeEventListener("resize", measure); };
  }, [open, location, zoom]);
  const turn = (offset: number) => {
    const area = viewport.current!;
    area.scrollTo({ top: Math.max(0, Math.min(pages - 1, page + offset)) * area.clientHeight, behavior: "smooth" });
  };
  const close = () => {
    if (document.fullscreenElement === shell.current) void document.exitFullscreen();
    setOpen(false);
    setZoom(1);
  };
  return <section ref={shell} className={`bg-background text-foreground ${open ? "book-reader flex flex-col" : ""}`}>
    <nav aria-label={ar ? "أدوات تصفح الكتاب" : "Book reader tools"} dir={ar ? "rtl" : "ltr"} className="flex flex-wrap items-center gap-2 border-b border-border bg-background p-2">
      {!open ? <button type="button" onClick={() => setOpen(true)}>{ar ? "📖 تصفح ورقة بورقة" : "📖 Book reader"}</button> : <>
        <button type="button" aria-label={ar ? "إغلاق القارئ" : "Close reader"} onClick={close}>×</button>
        <button type="button" disabled={page === 0} onClick={() => turn(-1)}>{ar ? "السابق" : "Previous"}</button>
        <output aria-live="polite">{page + 1} / {pages}</output>
        <button type="button" disabled={page >= pages - 1} onClick={() => turn(1)}>{ar ? "التالي" : "Next"}</button>
        <button type="button" aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>−</button>
        <output>{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + 0.25))}>+</button>
        <button type="button" onClick={async () => {
          try {
            if (document.fullscreenElement === shell.current) await document.exitFullscreen();
            else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen();
            else throw new Error("unsupported");
            setFullscreenError("");
          } catch { setFullscreenError(ar ? "ملء الشاشة غير متاح في هذا المتصفح" : "Fullscreen is unavailable in this browser"); }
        }}>{ar ? "ملء الشاشة" : "Fullscreen"}</button>
        <button type="button" aria-expanded={toc} onClick={() => setToc(v => !v)}>{ar ? "الفهرس" : "Contents"}</button>
        {fullscreenError && <span role="status">{fullscreenError}</span>}
      </>}
    </nav>
    {open && toc && <nav aria-label={ar ? "الفهرس" : "Contents"} className="max-h-48 overflow-auto border-b border-border p-2">
      {headings.length ? headings.map((heading, index) => <button className="block" type="button" key={index} onClick={() => {
        const area = viewport.current!;
        area.scrollTo({ top: area.scrollTop + heading.getBoundingClientRect().top - area.getBoundingClientRect().top });
        setToc(false);
      }}>{heading.textContent}</button>) : <p>{ar ? "لا توجد عناوين في هذه الصفحة" : "No headings on this page"}</p>}
    </nav>}
    <div ref={viewport} tabIndex={open ? 0 : undefined} aria-label={open ? (ar ? "صفحات الكتاب" : "Book pages") : undefined}
      className={open ? "min-h-0 flex-1 overflow-auto" : ""}
      onKeyDown={event => {
        if (!open || event.target !== event.currentTarget) return;
        if (event.key === "Escape") close();
        if (event.key === "PageDown" || event.key === "PageUp") { event.preventDefault(); turn(event.key === "PageDown" ? 1 : -1); }
      }}
      onScroll={() => { const area = viewport.current!; setPage(currentPage(area, pages)); }}>
      <div ref={content} style={open ? { zoom } : undefined}>{children}</div>
    </div>
  </section>;
}
