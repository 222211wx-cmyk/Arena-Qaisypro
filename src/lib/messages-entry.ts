export const MESSAGES_ENTRY_PATH = "/messages";

/** Exact standalone messenger entry points (the remaining names are aliases). */
export function isMessagesEntryPath(path: string): boolean {
  const route = path.replace(/\/+$/, "") || "/";
  return route === MESSAGES_ENTRY_PATH || route === "/mes" || route === "/message-calle" ||
    route === "/messages.call" || route === "/messagerie" ||
    route === "/message%20calle" || route === "/message calle";
}

/** Only an internal messenger URL may survive the auth round-trip. */
export function messagesReturnPath(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  return next && /^\/(?:mes|messages\.call|message-calle|messages|messagerie|message(?:%20| )calle)(?:[?#]|$)/.test(next) ? next : null;
}

export function messagesAuthUrl(route: "/login" | "/register", next: string): string {
  return `${route}?${new URLSearchParams({ next }).toString()}`;
}