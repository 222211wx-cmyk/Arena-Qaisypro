import type { GdnaSection } from "@/lib/gdna-core";

/**
 * Explicit assistance entrypoints (profile, clips/video, Souk, shared messenger)
 * route to the /chat control surface with a section and a user-reviewed prompt.
 *
 * The draft prompt is carried in the URL only. It is a suggested wording the
 * citizen sees and edits in a review step before anything is sent. We never
 * auto-send, and we never embed decrypted messages or arbitrary private profile
 * data — pass only text the citizen has explicitly chosen to share.
 */
export interface GdnaAssistLink {
  section: GdnaSection;
  /** Suggested prompt text. Shown for review/edit; never auto-sent. */
  prompt?: string;
}

const PROMPT_MAX = 800;

/** Build a /chat href that opens the given section with a review-first draft prompt. */
export function gdnaAssistHref({ section, prompt }: GdnaAssistLink): string {
  const params = new URLSearchParams();
  params.set("section", section);
  if (prompt && prompt.trim()) {
    params.set("draft", prompt.trim().slice(0, PROMPT_MAX));
  }
  // review=1 forces the review step so nothing sends without the citizen's action.
  params.set("review", "1");
  return `/chat?${params.toString()}`;
}

export interface GdnaChatIntent {
  section?: GdnaSection;
  draft?: string;
  review: boolean;
}

const VALID_SECTIONS: GdnaSection[] = ["hisn", "helixly", "souk", "guard", "dev"];

/** Parse an incoming /chat query string into a section + review-first draft intent. */
export function parseGdnaChatIntent(search: string): GdnaChatIntent {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const rawSection = params.get("section");
  const section =
    rawSection && (VALID_SECTIONS as string[]).includes(rawSection)
      ? (rawSection as GdnaSection)
      : undefined;
  const draft = params.get("draft") ?? undefined;
  return {
    section,
    draft: draft ? draft.slice(0, PROMPT_MAX) : undefined,
    // Any draft carried from an entrypoint must be reviewed before sending.
    review: params.get("review") === "1" || Boolean(draft),
  };
}
