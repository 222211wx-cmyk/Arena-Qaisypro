/** Shared with Lite: no Firebase, React, or application-shell dependencies. */
export function recoveryReturnPath(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  if (!next || /[\\\u0000-\u001f]/.test(next) || next.startsWith("//")) return null;
  // Restrict destinations to known account/messaging surfaces, never external URLs.
  return /^\/(?:lite(?:\/(?:login|settings|in|africa|brasil))?|social|dashboard|messages|messages\.call|message-calle|messagerie)(?:[?#]|$)/.test(next) ? next : null;
}

export function recoveryRoute(route: "/recover-account" | "/recovery-phone" | "/recovery-code" | "/recover-with-code", next: string | null = null, lang?: string): string {
  const query = new URLSearchParams();
  if (next && recoveryReturnPath(`next=${encodeURIComponent(next)}`)) query.set("next", next);
  if (lang && ["en", "fr", "ar", "es", "de"].includes(lang)) query.set("lang", lang);
  return `${route}${query.size ? `?${query}` : ""}`;
}

/** A guest enrollment round-trip, normalized rather than trusting raw next. */
export function recoveryEnrollmentReturnPath(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  if (!next || /[\\\u0000-\u001f]/.test(next)) return null;
  const [path, query = ""] = next.split("?");
  if (path !== "/recovery-phone" && path !== "/recovery-code") return null;
  const params = new URLSearchParams(query);
  return recoveryRoute(path, recoveryReturnPath(query), params.get("lang") ?? undefined);
}

/** For anchors crossing between the Lite shell and full website. */
export function recoveryWebHref(route: "/recover-account" | "/recovery-phone" | "/recovery-code" | "/recover-with-code", next: string, lang: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}${recoveryRoute(route, next, lang)}`;
}

/** Same-origin account round-trip, never an arbitrary next URL. */
export function citizenReturnPath(search:string):string|null {
 const value=new URLSearchParams(search).get('next');
 if(!value || /[\\\u0000-\u001f]/.test(value))return null;
 return /^\/(?:clips|competitions|games|social|market|learn|genome|ameeq|hub|dashboard)(?:[?#]|$)/.test(value)?value:null;
}
