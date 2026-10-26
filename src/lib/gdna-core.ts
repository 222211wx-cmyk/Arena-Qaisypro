import { apiPath } from "@/lib/network";

/**
 * GDNA_CORE — browser adapter for the authenticated /api/gdna surface.
 *
 * Client identity ("citizen") is passed for local UX only; the server derives
 * the real caller from the session cookie and ignores any client-supplied
 * identity. Never trust `user` on the server side.
 */

/** GDNA operating sections. `hisn` is the citizen-facing default. */
export type GdnaSection = "hisn" | "helixly" | "souk" | "guard" | "dev";

export const GDNA_SECTIONS: GdnaSection[] = ["hisn", "helixly", "souk", "guard", "dev"];

export interface GdnaCitation {
  label: string;
  url?: string;
}

export interface GdnaSuggestion {
  title: string;
  description: string;
  url?: string;
}

export interface GdnaUsage {
  used: number;
  limit: number;
}

export interface GdnaAskResult {
  reply: string;
  mode: "llm" | "rules";
  agent: string;
  citations: GdnaCitation[];
  suggestions: GdnaSuggestion[];
  usage: GdnaUsage;
  auditId: string;
}

export interface GdnaAgent {
  id: string;
  name: string;
  description: string;
}

export interface GdnaStatus {
  available: boolean;
  mode: "llm" | "rules";
  agents: GdnaAgent[];
  usage: GdnaUsage;
  platform: Record<string, unknown>;
}

export interface GdnaEvolutionEntry {
  id: string;
  agent: string;
  summary: string;
  createdAt: string;
}

export interface GdnaEvolutionLog {
  entries: GdnaEvolutionEntry[];
}

export interface GdnaMemoryEntry {
  id: string;
  content: string;
  createdAt: string;
}

export interface GdnaMemory {
  entries: GdnaMemoryEntry[];
}

export interface GdnaAskOptions {
  section: GdnaSection;
  /** Client-side actor label only; the server resolves the real caller from the session. */
  user?: string;
  /** Opt-in: persist this exchange to the caller's account memory. */
  remember?: boolean;
}

/** Error carrying the HTTP status and any server-provided quota usage. */
export class GdnaError extends Error {
  readonly status: number;
  readonly usage?: GdnaUsage;
  readonly code?: string;

  constructor(message: string, status: number, extra?: { usage?: GdnaUsage; code?: string }) {
    super(message);
    this.name = "GdnaError";
    this.status = status;
    this.usage = extra?.usage;
    this.code = extra?.code;
  }
}

async function gdnaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiPath(path), {
    credentials: "include",
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
        : init?.headers,
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let usage: GdnaUsage | undefined;
    let code: string | undefined;
    try {
      const data = (await res.json()) as { error?: string; message?: string; code?: string; usage?: GdnaUsage };
      message = data.error ?? data.message ?? message;
      usage = data.usage;
      code = data.code;
    } catch {
      /* non-JSON error body */
    }
    throw new GdnaError(message, res.status, { usage, code });
  }

  return (await res.json()) as T;
}

export const GDNA_CORE = {
  /**
   * Ask GDNA a question inside a section. The server owns identity, quota, and
   * provider selection; the returned `mode` reports whether an LLM or the rules
   * fallback answered. Never fabricate a reply on the client.
   */
  async ask(query: string, opts: GdnaAskOptions): Promise<GdnaAskResult> {
    const trimmed = query.trim();
    if (!trimmed) throw new GdnaError("Query is required.", 400);
    return gdnaFetch<GdnaAskResult>("/api/gdna/ask", {
      method: "POST",
      body: JSON.stringify({
        query: trimmed,
        section: opts.section,
        ...(opts.remember ? { remember: true } : {}),
      }),
    });
  },

  async status(): Promise<GdnaStatus> {
    return gdnaFetch<GdnaStatus>("/api/gdna/status", { method: "GET" });
  },

  async evolutionLog(): Promise<GdnaEvolutionLog> {
    return gdnaFetch<GdnaEvolutionLog>("/api/gdna/evolution-log", { method: "GET" });
  },

  async memory(): Promise<GdnaMemory> {
    return gdnaFetch<GdnaMemory>("/api/gdna/memory", { method: "GET" });
  },

  /** Delete one memory entry by id, or clear the caller's own memory when id is omitted. */
  async deleteMemory(id?: string): Promise<void> {
    await gdnaFetch<unknown>("/api/gdna/memory", {
      method: "DELETE",
      body: id ? JSON.stringify({ id }) : undefined,
    });
  },
};

export type GdnaCore = typeof GDNA_CORE;
