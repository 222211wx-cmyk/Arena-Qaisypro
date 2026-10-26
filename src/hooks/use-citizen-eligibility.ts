import { useMutation } from "@tanstack/react-query";
import { apiPath } from "@/lib/network";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Captures a missing date of birth via the app's existing, legitimate age
 * endpoint (POST /api/auth/birth-date) — the same one AgeGate uses — WITHOUT
 * imposing the Games age gate on general social use. General profiles are
 * allowed at any age; only availability/matchmaking require a persisted adult
 * DOB. We never fabricate a DOB and never grant matching to minors/unknown:
 * the backend decides adulthood and refreshUser() re-reads the authoritative
 * isAdult flag.
 */
export function useCaptureBirthDate() {
  const { refreshUser } = useAuth();
  return useMutation<void, Error, { birthDate: string }>({
    mutationFn: async ({ birthDate }) => {
      const res = await fetch(apiPath("/api/auth/birth-date"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ birthDate }),
      });
      if (!res.ok) {
        let message = "تعذّر حفظ تاريخ الميلاد.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          /* ignore non-JSON */
        }
        throw new Error(message);
      }
    },
    onSuccess: () => {
      // Re-read authoritative isAdult from the server; never infer client-side.
      void refreshUser();
    },
  });
}
