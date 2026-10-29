// Facebook-Reels-style dark chrome for the GDNA clip feed. Every colour, radius,
// and spacing value derives from the design-system dark palette + base spacing
// step passed in — no invented palette. Icons stay white per spec.

type Palette = Record<string, string>;

export function reelsShellCss(palette: Palette, space: string): string {
  return `
  /* ── Root feed shell: fullscreen vertical, iOS safe areas ─────────────── */
  .reels-shell{
    position:fixed;inset:var(--arena-navigation-height, 0px) 0 0;
    background:${palette.background};
    color:${palette.foreground};
    direction:ltr;
    display:flex;flex-direction:column;
    overflow:hidden;
    --reels-top-safe:env(safe-area-inset-top,0px);
    --reels-bottom-safe:env(safe-area-inset-bottom,0px);
    /* All media-overlay colours derive from DS tokens (no invented palette).
       Text/icons over media are the near-white DS foreground; scrims and glass
       surfaces are color-mix() derivatives of the DS background/foreground so
       they track the theme instead of hardcoded black/white rgba(). */
    --reels-on-media:${palette.foreground};
    --reels-scrim-strong:color-mix(in srgb, ${palette.background} 78%, transparent);
    --reels-scrim:color-mix(in srgb, ${palette.background} 55%, transparent);
    --reels-scrim-soft:color-mix(in srgb, ${palette.background} 40%, transparent);
    --reels-glass:color-mix(in srgb, ${palette.foreground} 12%, transparent);
    --reels-glass-strong:color-mix(in srgb, ${palette.foreground} 22%, transparent);
    --reels-shadow:color-mix(in srgb, ${palette.background} 70%, transparent);
    --reels-on-media-dim:color-mix(in srgb, ${palette.foreground} 78%, transparent);
  }
  .reels-shell.reels-css-fullscreen,.reels-shell.clip-css-fullscreen{position:fixed;inset:0;z-index:2147483647}
  .reels-shell *{box-sizing:border-box}

  /* ── Top bar ──────────────────────────────────────────────────────────── */
  .reels-topbar{
    height:56px; min-height:56px;
    position:absolute;left:0;right:0;top:0;z-index:41;
    display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;
    gap:calc(${space} * 2);
    padding:0 calc(${space} * 3);
    background:linear-gradient(to bottom, var(--reels-scrim-strong), transparent);
    pointer-events:none;
  }
  .reels-topbar-left,.reels-topbar-right{min-width:0}
  .reels-topbar-right{justify-content:flex-end}
  .reels-topbar > .reels-title{position:static;min-width:0;text-align:center;font-size:clamp(.875rem,4vw,1.4rem);white-space:nowrap}
  .reels-topbar > *{pointer-events:auto}
  .reels-topbar-left{display:flex;align-items:center;gap:calc(${space} * 3)}
  .reels-title{font-size:1.4rem;font-weight:900;letter-spacing:-.01em;color:var(--reels-on-media);margin:0}
  .reels-topbar-right{display:flex;align-items:center;gap:${space}}
  .reels-icon-btn{
    display:inline-flex;align-items:center;justify-content:center;
    width:44px;height:44px;padding:0;margin:0;border:0;border-radius:9999px;
    background:transparent;color:var(--reels-on-media);cursor:pointer;
    filter:drop-shadow(0 1px 3px var(--reels-shadow));
    -webkit-tap-highlight-color:transparent;
  }
  .reels-icon-btn:hover{background:var(--reels-glass)}
  .reels-icon-btn:focus-visible{outline:2px solid ${palette.ring};outline-offset:2px}
  .reels-icon-btn svg{width:26px;height:26px}
  .reels-icon-btn.reels-badge-host{position:relative}
  .reels-viewer-close{position:absolute;left:calc(${space} * 3);top:calc(var(--reels-top-safe) + 68px);z-index:8;background:var(--reels-scrim)}
  .reels-badge{
    position:absolute;top:6px;right:6px;min-width:18px;height:18px;
    padding:0 5px;border-radius:9999px;
    background:${palette.destructive};color:${palette.destructiveForeground};
    font-size:.6875rem;font-weight:800;line-height:18px;text-align:center;
    box-shadow:0 0 0 2px ${palette.background};
  }

  /* ── Vertical scroll-snap feed track ──────────────────────────────────── */
  .reels-track{
    flex:1;min-height:0;
    overflow-y:auto;overflow-x:hidden;
    scroll-snap-type:y mandatory;
    scrollbar-width:none;-ms-overflow-style:none;
    overscroll-behavior:contain;
    touch-action:pan-y;
  }
  .reels-track::-webkit-scrollbar{display:none}

  .reels-slide{
    position:relative;
    height:100%;width:100%;
    scroll-snap-align:start;scroll-snap-stop:always;
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;
    background:${palette.background};
  }

  /* Blurred poster/frame background behind a contained landscape video. The
     background is ALWAYS derived from the clip's own poster or the video frame —
     never unrelated imagery. */
  .reels-bg{
    position:absolute;inset:0;
    background-size:cover;background-position:center;
    filter:blur(28px) brightness(.5);transform:scale(1.15);
    z-index:0;
  }
  .reels-bg-fallback{position:absolute;inset:0;background:${palette.card};z-index:0}

  .reels-media-wrap{
    position:relative;z-index:1;
    width:100%;height:calc(100% - var(--reels-bottom-safe) - ${space} * 20);max-height:100%;
    align-self:flex-start;
    display:flex;align-items:center;justify-content:center;
  }
  .reels-media-error{
    position:absolute;inset:0;z-index:12;display:grid;place-content:center;text-align:center;
    gap:calc(${space} * 3);padding:calc(${space} * 4);
    background:${palette.background};color:${palette.foreground};
  }
  .reels-slide video{
    pointer-events:auto !important;position:relative;z-index:1;
    display:block;width:100%;height:auto;
    max-height:100%;object-fit:contain;background:transparent;
  }
  /* Portrait / square clips fill; landscape clips stay contained with the
     blurred background showing above and below (letterbox). */
  .reels-slide[data-orient="portrait"] video{width:100%;height:100%;object-fit:cover}

  .reels-poster{
    position:absolute;inset:0;z-index:0;
    width:100%;height:100%;object-fit:contain;
    background:transparent;pointer-events:none;
  }

  /* Center play + fullscreen affordances. */
  .reels-center{
    position:absolute;inset:0;z-index:2;
    display:flex;align-items:center;justify-content:center;
    pointer-events:none;
  }
  .reels-center-btn{
    pointer-events:auto;border:0;cursor:pointer;
    color:var(--reels-on-media);
    display:flex;align-items:center;justify-content:center;
    filter:drop-shadow(0 2px 8px var(--reels-shadow));
    transition:opacity .18s ease, transform .18s ease;
  }
  .reels-center-btn:focus-visible{outline:2px solid ${palette.ring};outline-offset:3px}
  /* Persistent play/pause control: listening always remains citizen-controlled. */
  .reels-play{
    position:absolute;
    width:64px;height:64px;border-radius:9999px;
    background:var(--reels-scrim);
  }
  .reels-play:hover{background:var(--reels-scrim-strong)}
  .reels-play svg{width:34px;height:34px}
  .reels-play-instruction{
    position:absolute;top:calc(100% + ${space} * 3);left:50%;
    transform:translateX(-50%);white-space:nowrap;
    padding:calc(${space} * 2) calc(${space} * 4);
    border-radius:9999px;background:var(--reels-scrim-strong);
    color:var(--reels-on-media);font-size:.875rem;font-weight:700;
    text-shadow:0 1px 3px var(--reels-shadow);
  }
  .reels-center[data-paused="false"] .reels-play{opacity:.72;transform:scale(.78)}
  .reels-center[data-paused="false"] .reels-play:hover,
  .reels-center[data-paused="false"] .reels-play:focus-visible{opacity:1;transform:scale(.9)}
  /* Always-visible "Plein écran" pill (icon + label), stays during playback. */
  .reels-fs-pill{
    position:absolute;bottom:calc(120px + var(--reels-bottom-safe));
    gap:calc(${space} * 2);
    padding:calc(${space} * 2) calc(${space} * 4);border-radius:9999px;
    background:var(--reels-glass-strong);
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
    font-size:.8125rem;font-weight:700;
    text-shadow:0 1px 3px var(--reels-shadow);
  }
  .reels-fs-pill:hover{background:var(--reels-glass)}
  .reels-fs-pill-icon{display:inline-flex}
  .reels-fs-pill-icon svg{width:20px;height:20px}
  .reels-fs-pill-label{line-height:1}

  /* Slide-level status/spinner. */
  .reels-slide-status{
    position:absolute;z-index:2;left:50%;bottom:calc(96px + var(--reels-bottom-safe));
    transform:translateX(-50%);
    color:var(--reels-on-media);font-size:.8125rem;background:var(--reels-scrim);
    padding:calc(${space} * 2) calc(${space} * 3);border-radius:9999px;
    text-shadow:0 1px 2px var(--reels-shadow);pointer-events:none;
  }
  .reels-spinner{
    width:34px;height:34px;border-radius:9999px;
    border:3px solid var(--reels-glass-strong);border-top-color:var(--reels-on-media);
    animation:reels-spin .8s linear infinite;
  }
  @keyframes reels-spin{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){.reels-spinner{animation-duration:1.6s}}

  /* The VideoActions overlay (rail + meta) is positioned relative to the slide,
     lifted above the bottom nav. */
  .reels-slide .video-actions-shell{position:static}
  .reels-slide .clip-overlay{position:absolute;inset:0;z-index:13;pointer-events:none}
  .reels-slide .clip-overlay button,.reels-slide .clip-overlay a,
  .reels-slide .clip-overlay input,.reels-slide .clip-overlay textarea{pointer-events:auto}
  .reels-slide .clip-rail{bottom:calc(104px + var(--reels-bottom-safe))}
  .reels-slide .clip-meta{bottom:calc(104px + var(--reels-bottom-safe));pointer-events:none}
  .reels-slide .action-status{
    position:absolute;left:16px;right:72px;bottom:calc(84px + var(--reels-bottom-safe));
    z-index:4;color:var(--reels-on-media);font-size:.8125rem;text-shadow:0 1px 3px var(--reels-shadow);margin:0;
  }
  /* Comments panel: bottom sheet inside the slide. */
  .reels-slide .clip-comments{
    position:absolute;left:0;right:0;bottom:0;z-index:6;
    max-height:60%;overflow-y:auto;
    background:${palette.card};color:${palette.cardForeground};
    border-top-left-radius:calc(${space} * 4);border-top-right-radius:calc(${space} * 4);
    border-top:1px solid ${palette.border};
    padding:calc(${space} * 4) calc(${space} * 4) calc(var(--reels-bottom-safe) + ${space} * 4);
    box-shadow:0 -8px 32px var(--reels-shadow);
  }
  .reels-slide .comment-form input{
    background:${palette.secondary};color:${palette.foreground};
    border:1px solid ${palette.input};border-radius:9999px;padding:calc(${space} * 2) calc(${space} * 3);
  }
  .reels-slide .comment-form button,.reels-slide .title-edit button{
    background:${palette.primary};color:${palette.primaryForeground};font-weight:700;
    border:0;border-radius:9999px;padding:calc(${space} * 2) calc(${space} * 4);cursor:pointer;
  }

  /* ── Author avatar + Suivre (follow) block, bottom-left ───────────────── */
  .reels-author{display:flex;align-items:center;gap:calc(${space} * 2);margin-bottom:calc(${space} * 2)}
  .reels-avatar{
    width:40px;height:40px;border-radius:9999px;flex:none;overflow:hidden;
    background:${palette.secondary};border:2px solid var(--reels-on-media);
    display:flex;align-items:center;justify-content:center;
    color:var(--reels-on-media);font-weight:800;font-size:.95rem;text-decoration:none;
  }
  .reels-avatar img{width:100%;height:100%;object-fit:cover;display:block}
  .reels-author-name{color:var(--reels-on-media);font-weight:700;font-size:.95rem;text-decoration:none;text-shadow:0 1px 3px var(--reels-shadow)}
  .reels-author-name:hover{text-decoration:underline}
  .reels-follow-btn{
    margin-inline-start:calc(${space} * 1);
    padding:calc(${space} * 1) calc(${space} * 3);
    border:1px solid var(--reels-on-media);border-radius:9999px;
    background:transparent;color:var(--reels-on-media);font-weight:700;font-size:.8125rem;cursor:pointer;
    -webkit-tap-highlight-color:transparent;
  }
  .reels-follow-btn[data-following="true"]{border-color:var(--reels-glass-strong);color:var(--reels-on-media-dim)}
  .reels-follow-btn:disabled{opacity:.6;cursor:default}
  .reels-follow-btn:focus-visible{outline:2px solid ${palette.ring};outline-offset:2px}

  /* Arabic caption with expansion — bidi safe. */
  .reels-caption{color:var(--reels-on-media);font-size:.9rem;line-height:1.4;text-shadow:0 1px 3px var(--reels-shadow);margin:0}
  .reels-caption[data-expanded="false"]{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  /* When the owner opens the title editor, the caption hosts the edit form. */
  .reels-caption .title-edit{display:flex;gap:calc(${space} * 2);align-items:center}
  .reels-caption .title-edit input{
    flex:1;min-width:0;background:${palette.secondary};color:${palette.foreground};
    border:1px solid ${palette.input};border-radius:9999px;padding:calc(${space} * 2) calc(${space} * 3);font-size:.9rem;
  }
  .reels-caption .title-edit input:focus-visible{outline:2px solid ${palette.ring};outline-offset:1px}
  .reels-caption-toggle{
    background:none;border:0;color:var(--reels-on-media-dim);font-weight:700;font-size:.8125rem;
    cursor:pointer;padding:0;margin-top:calc(${space} * 1);text-shadow:0 1px 3px var(--reels-shadow);
  }
  .reels-caption-toggle:focus-visible{outline:2px solid ${palette.ring};outline-offset:2px;border-radius:${space}}

  /* Grid/search metadata shows the persisted display title as the primary line. */
  .reels-grid-cell-title,.reels-grid-cell-author{
    display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  .reels-grid-cell-title{color:var(--reels-on-media);font-weight:700}
  .reels-grid-cell-author{color:var(--reels-on-media-dim);font-size:.75rem}

  /* ── On-screen editing tools (horizontal-swipe panel) ─────────────────── */
  .reels-tools-panel{
    position:absolute;top:0;bottom:0;right:0;z-index:35;
    width:min(78%,320px);
    background:${palette.card};color:${palette.cardForeground};
    border-left:1px solid ${palette.border};
    transform:translateX(100%);transition:transform .22s ease;
    display:flex;flex-direction:column;gap:calc(${space} * 3);
    padding:calc(var(--reels-top-safe) + ${space} * 4) calc(${space} * 4) calc(var(--reels-bottom-safe) + ${space} * 4);
    box-shadow:-8px 0 32px var(--reels-shadow);
    overflow-y:auto;
  }
  .reels-shell[data-tools="open"] .reels-tools-panel{transform:translateX(0)}
  .reels-tools-title{font-size:1.05rem;font-weight:800;margin:0}
  .reels-tools-hint{color:${palette.mutedForeground};font-size:.8125rem;margin:0}
  .reels-tool-item{
    display:flex;align-items:center;gap:calc(${space} * 3);width:100%;
    padding:calc(${space} * 3);border:1px solid ${palette.border};border-radius:${space};
    background:${palette.secondary};color:${palette.secondaryForeground};
    font-weight:600;font-size:.9rem;text-align:left;cursor:pointer;
  }
  .reels-tool-item:hover,.reels-tool-item:focus-visible{border-color:${palette.ring};outline:none}
  .reels-tool-item:disabled{opacity:.5;cursor:not-allowed}
  .reels-tools-close{align-self:flex-end}

  /* ── Bottom navigation (four persistent destinations) ─────────────────── */
  .reels-bottomnav{
    position:absolute;left:0;right:0;bottom:0;z-index:40;
    display:flex;align-items:center;justify-content:space-around;
    padding:calc(${space} * 2) calc(${space} * 2) calc(var(--reels-bottom-safe) + ${space} * 2);
    background:${palette.background};
    border-top:1px solid ${palette.border};
  }
  .reels-nav-item{
    display:flex;flex-direction:column;align-items:center;gap:calc(${space} * 0.5);
    flex:1;min-width:0;padding:calc(${space} * 1);
    background:transparent;border:0;color:${palette.mutedForeground};
    text-decoration:none;font-size:.625rem;font-weight:600;cursor:pointer;
    -webkit-tap-highlight-color:transparent;
  }
  .reels-nav-item svg{width:24px;height:24px}
  .reels-nav-item[data-active="true"]{color:${palette.foreground}}
  .reels-nav-item:focus-visible{outline:2px solid ${palette.ring};outline-offset:-2px;border-radius:${space}}
  .reels-nav-item.reels-badge-host{position:relative}
  .reels-nav-avatar{
    width:24px;height:24px;border-radius:9999px;overflow:hidden;flex:none;
    background:${palette.secondary};border:1px solid ${palette.border};
    display:flex;align-items:center;justify-content:center;font-size:.6875rem;font-weight:800;color:${palette.foreground};
  }
  .reels-nav-avatar img{width:100%;height:100%;object-fit:cover;display:block}
  .reels-nav-item[data-active="true"] .reels-nav-avatar{border-color:${palette.foreground}}

  /* ── Grid view (three-column) ─────────────────────────────────────────── */
  .reels-grid-view{
    position:absolute;inset:0;z-index:12;
    background:${palette.background};
    display:flex;flex-direction:column;
    padding-top:calc(var(--reels-top-safe) + 64px);
    padding-bottom:calc(var(--reels-bottom-safe) + 68px);
    overflow-y:auto;
  }
  .reels-grid-pagination{
    display:flex;align-items:center;justify-content:center;gap:calc(${space} * 3);
  }
  .reels-grid{
    display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px;
  }
  .reels-grid-item{position:relative;aspect-ratio:9/16;overflow:hidden;background:${palette.card}}
  .reels-grid-cell{
    position:absolute;inset:0;overflow:hidden;
    background:${palette.card};border:0;padding:0;cursor:pointer;
  }
  .reels-grid-dismiss{position:absolute;top:6px;left:6px;z-index:3;background:#111;color:#fff}
  .reels-grid-cell img{width:100%;height:100%;object-fit:cover;display:block}
  .reels-grid-cell-fallback{
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    color:${palette.mutedForeground};font-size:.75rem;padding:calc(${space} * 2);text-align:center;
  }
  .reels-grid-cell-meta{
    position:absolute;left:0;right:0;bottom:0;
    padding:calc(${space} * 3) calc(${space} * 2) calc(${space} * 2);
    background:linear-gradient(to top, var(--reels-scrim-strong), transparent);
    color:var(--reels-on-media);font-size:.6875rem;display:grid;gap:calc(${space} * 1);text-align:start;
  }
  .reels-grid-cell:focus-visible{outline:2px solid ${palette.ring};outline-offset:-2px}
  .reels-grid-delete{
    position:absolute;z-index:2;top:calc(${space} * 2);right:calc(${space} * 2);
    width:36px;height:36px;border-radius:9999px;border:1px solid ${palette.border};
    background:${palette.destructive};color:${palette.destructiveForeground};
    font-size:1.25rem;font-weight:800;cursor:pointer;
  }
  .reels-grid-delete:disabled{opacity:.55;cursor:default}

  /* ── Search overlay ───────────────────────────────────────────────────── */
  .reels-search{
    position:absolute;inset:0;z-index:22;background:${palette.background};
    display:flex;flex-direction:column;
    padding:calc(var(--reels-top-safe) + 76px) calc(${space} * 3) calc(var(--reels-bottom-safe) + 76px);
    gap:calc(${space} * 3);
  }
  .reels-search-bar{display:flex;align-items:center;gap:calc(${space} * 2)}
  .reels-search-input{
    flex:1;min-width:0;background:${palette.secondary};color:${palette.foreground};
    border:1px solid ${palette.input};border-radius:9999px;padding:calc(${space} * 3) calc(${space} * 4);font-size:.95rem;
  }
  .reels-search-input:focus-visible{outline:2px solid ${palette.ring};outline-offset:1px}
  .reels-search-results{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2px}

  /* ── Notifications overlay ────────────────────────────────────────────── */
  .reels-notif{
    position:absolute;inset:0;z-index:22;background:${palette.background};color:${palette.foreground};
    display:flex;flex-direction:column;
    padding-bottom:calc(var(--reels-bottom-safe) + 76px);
  }
  .reels-notif-head{
    display:flex;align-items:center;justify-content:space-between;gap:calc(${space} * 2);
    padding:calc(var(--reels-top-safe) + 76px) calc(${space} * 3) calc(${space} * 3);
    border-bottom:1px solid ${palette.border};
  }
  .reels-notif-head h2{margin:0;font-size:1.1rem;font-weight:800}
  .reels-notif-readall{
    background:transparent;border:0;color:${palette.primary};font-weight:700;font-size:.8125rem;cursor:pointer;
  }
  .reels-notif-list{flex:1;overflow-y:auto;display:flex;flex-direction:column}
  .reels-notif-item{
    display:flex;gap:calc(${space} * 3);align-items:flex-start;
    width:100%;text-align:left;background:transparent;border:0;
    padding:calc(${space} * 3) calc(${space} * 4);
    border-bottom:1px solid ${palette.border};cursor:pointer;color:${palette.foreground};
  }
  .reels-notif-item[data-unread="true"]{background:${palette.secondary}}
  .reels-notif-dot{width:8px;height:8px;border-radius:9999px;background:${palette.primary};margin-top:6px;flex:none}
  .reels-notif-item[data-unread="false"] .reels-notif-dot{visibility:hidden}
  .reels-notif-body{min-width:0}
  .reels-notif-title{margin:0;font-weight:700;font-size:.9rem}
  .reels-notif-text{margin:2px 0 0;font-size:.8125rem;color:${palette.mutedForeground}}

  /* ── Shared empty / error / loading centered states ───────────────────── */
  .reels-fullstate{
    position:absolute;inset:0;z-index:10;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:calc(${space} * 4);text-align:center;padding:calc(${space} * 6);
    color:${palette.foreground};
  }
  .reels-fullstate p{margin:0;max-width:22rem}
  .reels-fullstate .reels-muted{color:${palette.mutedForeground}}
  .reels-btn{
    padding:calc(${space} * 3) calc(${space} * 5);border-radius:9999px;border:0;
    background:${palette.primary};color:${palette.primaryForeground};font-weight:800;cursor:pointer;font-size:.95rem;
  }
  .reels-btn.reels-btn-secondary{background:${palette.secondary};color:${palette.secondaryForeground};border:1px solid ${palette.border}}
  .reels-btn:focus-visible{outline:2px solid ${palette.ring};outline-offset:2px}
  .reels-btn-row{display:flex;gap:calc(${space} * 3);flex-wrap:wrap;justify-content:center}

  .reels-degraded-banner{
    position:absolute;left:50%;top:calc(var(--reels-top-safe) + 64px);transform:translateX(-50%);
    z-index:18;background:${palette.destructive};color:${palette.destructiveForeground};
    padding:calc(${space} * 2) calc(${space} * 4);border-radius:9999px;font-size:.8125rem;font-weight:700;
  }

  /* ── Upload composer sheet (camera) hosts the existing #upload form ────── */
  .reels-composer{
    position:absolute;inset:0;z-index:24;background:${palette.background};color:${palette.foreground};
    display:flex;flex-direction:column;overflow-y:auto;
    padding-top:calc(var(--reels-top-safe) + 64px);
    padding-bottom:calc(var(--reels-bottom-safe) + 76px);
  }
  .reels-composer-head{
    position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:calc(${space} * 3);
    padding:calc(${space} * 3);
    background:${palette.background};border-bottom:1px solid ${palette.border};
  }
  .reels-composer-head h2{margin:0;font-size:1.1rem;font-weight:800}
  .reels-composer-body{padding:calc(${space} * 4);max-width:40rem;width:100%;margin:0 auto}

  /* ── Desktop: constrain the phone-like column, center it ───────────────── */
  @media (min-width:768px){
    .reels-shell{align-items:stretch}
    .reels-track{margin-inline:auto}
    .reels-slide{max-width:min(520px,calc((100dvh - 120px) * 9 / 16));margin-inline:auto}
    .reels-topbar,.reels-bottomnav{max-width:520px;margin-inline:auto}
    .reels-grid,.reels-search-results{grid-template-columns:repeat(3,1fr);max-width:720px;margin-inline:auto;width:100%}
  }
  `;
}
