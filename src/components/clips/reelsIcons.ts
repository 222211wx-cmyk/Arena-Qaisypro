// Reels chrome icons: top bar (hamburger, camera, search, more), the center
// fullscreen ("Plein écran") button, and the bottom flat navigation bar.
// Rendered white with currentColor; no emojis anywhere. Sized by CSS.

function svg(paths: string, opts: { size?: number; filled?: boolean; stroke?: number } = {}): string {
  const size = opts.size ?? 28;
  const stroke = opts.stroke ?? 1.9;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${
    opts.filled ? "currentColor" : "none"
  }" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

export const reelsIcons = {
  hamburger: () =>
    svg('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>'),
  camera: () =>
    svg('<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h2.2l1.1-1.6A1 1 0 0 1 8.6 4h6.8a1 1 0 0 1 .8.4L17.3 6h2.2A1.5 1.5 0 0 1 21 7.5v10A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/><circle cx="12" cy="12.5" r="3.4"/>'),
  search: () =>
    svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'),
  more: () =>
    svg('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
  close: () =>
    svg('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>'),
  back: () =>
    svg('<path d="M15 5l-7 7 7 7"/>'),
  // Center-of-frame fullscreen toggle ("Plein écran").
  fullscreen: (active = false) =>
    active
      ? svg('<path d="M9 4H6a2 2 0 0 0-2 2v3"/><path d="M15 4h3a2 2 0 0 1 2 2v3"/><path d="M9 20H6a2 2 0 0 1-2-2v-3"/><path d="M15 20h3a2 2 0 0 0 2-2v-3"/>')
      : svg('<path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M20 9V5a1 1 0 0 0-1-1h-4"/><path d="M4 15v4a1 1 0 0 0 1 1h4"/><path d="M20 15v4a1 1 0 0 1-1 1h-4"/>'),
  grid: (active = false) =>
    active
      ? svg('<rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor"/>', { filled: true })
      : svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  // Editing tools panel toggle (horizontal-swipe surface).
  tools: () =>
    svg('<path d="M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"/><path d="M12 8v.01"/><path d="M12 12v4"/>'),
  // ── Bottom navigation (flat) ──────────────────────────────────────────
  navHome: (active = false) =>
    svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>', { filled: active, size: 24 }),
  navReels: (active = false) =>
    svg('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/><path d="M8 4l2.5 5"/><path d="M14 4l2.5 5"/><path d="M11 12.5v4l3.5-2Z"/>', { filled: active, size: 24 }),
  navFriends: (active = false) =>
    svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.5 13.4a5.2 5.2 0 0 1 3 4.6"/>', { filled: active, size: 24 }),
  navShop: (active = false) =>
    svg('<path d="M4 7h16l-1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"/><path d="M8.5 7a3.5 3.5 0 0 1 7 0"/>', { filled: active, size: 24 }),
  navBell: (active = false) =>
    svg('<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/>', { filled: active, size: 24 }),
  navSearch: (active = false) =>
    svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>', { filled: active, size: 24 }),
};
