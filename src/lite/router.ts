/**
 * Lite router. Region and section names are reserved and never treated as
 * usernames, so /lite/in resolves to the India edition, not a citizen "in".
 */
export type Route =
  | { kind: "home"; edition: "default" | "in" | "africa" | "brasil" }
  | { kind: "profile"; username: string }
  | { kind: "market" }
  | { kind: "clips" }
  | { kind: "hisn" }
  | { kind: "messages"; roomId?: number }
  | { kind: "settings" }
  | { kind: "operators" }
  | { kind: "data" }
  // Partner surfaces are served through the Lite shell at their EXACT root URLs
  // (/partners/operators, /partners/dashboard) — see vite `liteShell`.
  | { kind: "partners-operators" }
  | { kind: "partners-dashboard" }
  | { kind: "login" };

const RESERVED = new Set([
  "in",
  "africa",
  "brasil",
  "u",
  "market",
  "clips",
  "hisn",
  "messages",
  "settings",
  "operators",
  "data",
  "login",
  "recover-account",
  "recovery-phone",
  "recovery-code",
  "recover-with-code",
]);

const EDITIONS = new Set(["in", "africa", "brasil"]);

const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

/** Strip the artifact base + the /lite prefix, returning the remaining segments. */
function segments(pathname: string): string[] {
  let path = pathname;
  if (base && path.startsWith(base)) path = path.slice(base.length);
  path = path.replace(/^\/+/, "");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "lite") parts.shift();
  return parts.map((p) => decodeURIComponent(p));
}

export function parseRoute(pathname: string): Route {
  const parts = segments(pathname);
  if (parts.length === 0) return { kind: "home", edition: "default" };

  const first = parts[0];

  // Partner surfaces mounted through the Lite shell at their exact root URLs.
  if (first === "partners") {
    if (parts[1] === "dashboard") return { kind: "partners-dashboard" };
    return { kind: "partners-operators" };
  }

  if (EDITIONS.has(first)) {
    return { kind: "home", edition: first as "in" | "africa" | "brasil" };
  }
  if (first === "market") return { kind: "market" };
  if (first === "clips") return { kind: "clips" };
  if (first === "hisn") return { kind: "hisn" };
  if (first === "settings") return { kind: "settings" };
  if (first === "operators") return { kind: "operators" };
  if (first === "data") return { kind: "data" };
  if (first === "login") return { kind: "login" };
  if (first === "messages") {
    const id = parts[1] ? Number(parts[1]) : undefined;
    return { kind: "messages", roomId: Number.isSafeInteger(id) ? id : undefined };
  }
  if (first === "u" && parts[1] && !RESERVED.has(parts[1])) {
    return { kind: "profile", username: parts[1] };
  }
  // /lite/:username alias — reserved names already handled above.
  if (!RESERVED.has(first)) return { kind: "profile", username: first };

  return { kind: "home", edition: "default" };
}

export function href(route: Route): string {
  const root = `${base}/lite`;
  switch (route.kind) {
    case "home":
      return route.edition === "default" ? root : `${root}/${route.edition}`;
    case "profile":
      return `${root}/u/${encodeURIComponent(route.username)}`;
    case "market":
      return `${root}/market`;
    case "clips":
      return `${root}/clips`;
    case "hisn":
      return `${root}/hisn`;
    case "messages":
      return route.roomId ? `${root}/messages/${route.roomId}` : `${root}/messages`;
    case "settings":
      return `${root}/settings`;
    case "operators":
      return `${root}/operators`;
    case "data":
      return `${root}/data`;
    case "partners-operators":
      return `${base}/partners/operators`;
    case "partners-dashboard":
      return `${base}/partners/dashboard`;
    case "login":
      return `${root}/login`;
  }
}

export function editionOf(route: Route): "default" | "in" | "africa" | "brasil" {
  return route.kind === "home" ? route.edition : "default";
}
