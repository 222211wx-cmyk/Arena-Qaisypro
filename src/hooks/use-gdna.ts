import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GDNA_CORE,
  GdnaError,
  type GdnaAskResult,
  type GdnaEvolutionLog,
  type GdnaMemory,
  type GdnaSection,
  type GdnaStatus,
} from "@/lib/gdna-core";

export const gdnaStatusKey = ["gdna", "status"] as const;
export const gdnaEvolutionKey = ["gdna", "evolution-log"] as const;
export const gdnaMemoryKey = ["gdna", "memory"] as const;

/** Platform status, agent roster, and daily quota. Refetches on mount and window focus. */
export function useGdnaStatus() {
  return useQuery<GdnaStatus, GdnaError>({
    queryKey: gdnaStatusKey,
    queryFn: () => GDNA_CORE.status(),
    staleTime: 30_000,
    retry: false,
  });
}

export function useGdnaEvolutionLog(enabled = true) {
  return useQuery<GdnaEvolutionLog, GdnaError>({
    queryKey: gdnaEvolutionKey,
    queryFn: () => GDNA_CORE.evolutionLog(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useGdnaMemory(enabled = true) {
  return useQuery<GdnaMemory, GdnaError>({
    queryKey: gdnaMemoryKey,
    queryFn: () => GDNA_CORE.memory(),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export interface GdnaAskVars {
  query: string;
  section: GdnaSection;
  remember?: boolean;
}

/**
 * Ask GDNA. On success we patch the status cache's usage in place (no refetch
 * cascade) and refresh memory when the exchange was saved.
 */
export function useGdnaAsk() {
  const qc = useQueryClient();
  return useMutation<GdnaAskResult, GdnaError, GdnaAskVars>({
    mutationFn: ({ query, section, remember }) =>
      GDNA_CORE.ask(query, { section, remember }),
    onSuccess: (data, vars) => {
      qc.setQueryData<GdnaStatus>(gdnaStatusKey, (old) =>
        old ? { ...old, usage: data.usage } : old,
      );
      if (vars.remember) {
        void qc.invalidateQueries({ queryKey: gdnaMemoryKey });
      }
    },
  });
}

export function useGdnaDeleteMemory() {
  const qc = useQueryClient();
  return useMutation<void, GdnaError, string | undefined>({
    mutationFn: (id) => GDNA_CORE.deleteMemory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: gdnaMemoryKey });
    },
  });
}
