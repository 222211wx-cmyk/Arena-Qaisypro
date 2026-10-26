import { useMutation } from "@tanstack/react-query";
import { citizenFetch } from "@/lib/citizen";
import type { CitizenCompatibility } from "@/hooks/use-citizen";

export type AiSection =
  | "profile"
  | "matchmaking"
  | "market"
  | "services"
  | "helixly"
  | "map"
  | "translate"
  | "auto-reply";

export interface CitizenAiRequest {
  section: AiSection;
  consent: true;
  username?: string;
  clipId?: number;
  listingId?: number;
  prompt?: string;
  text?: string;
  targetLanguage?: string;
}

export interface CitizenAiResponse {
  text: string;
  method: "ai" | "shared-interests-city-heuristic";
  compatibility?: CitizenCompatibility;
}

/** Explicit opt-in AI assistant. Callers MUST have saved aiConsent AND pass consent:true. */
export function useCitizenAssistant() {
  return useMutation<CitizenAiResponse, Error & { status?: number }, Omit<CitizenAiRequest, "consent">>(
    {
      mutationFn: (req) =>
        citizenFetch<CitizenAiResponse>("/api/ai/citizen-assistant", {
          method: "POST",
          body: JSON.stringify({ ...req, consent: true }),
        }),
    },
  );
}
