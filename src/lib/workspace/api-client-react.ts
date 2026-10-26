/** Supabase-backed public reads. Legacy privileged operations require the original backend. */
import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { supabase } from "../supabase";
import { mockTables, mockFigures } from "../mockData";
export const MOCK_UNAVAILABLE =
  "This operation requires the authenticated Arena backend. No changes were saved.";
export async function unavailable(): Promise<never> {
  throw new Error(MOCK_UNAVAILABLE);
}
type Params = Record<string, string | number | boolean | undefined>;
type Options<T> = {
  query?: Partial<UseQueryOptions<T, Error>>;
  request?: RequestInit;
};
export type OfflineRecoveryStatus = {
  active: boolean;
  expiresAt: string | null;
};
export type OfflineRecoveryResult = {
  success: boolean;
  username: string;
  revocationPending?: boolean;
};
export type ExhaustedClipThumbnail = {
  id: number;
  title: string;
  username: string;
  createdAt: string;
  thumbnailAttempts: number;
  thumbnailLastError: string | null;
  thumbnailRetryAttempts: number;
  thumbnailRetryAt: string;
  isFrozen: boolean;
};
export const getGetRecoveryCodeStatusQueryKey = () =>
  ["/api/auth/recovery-code/status"] as const;
export const getGetExhaustedClipThumbnailsQueryKey = (params?: Params) =>
  ["/api/admin/clips/thumbnails/exhausted", params] as const;
export const getGetGsFiguresQueryKey = (params?: Params) =>
  ["/api/gs/figures", params] as const;
export const getGetGsRankingQueryKey = (params?: Params) =>
  ["/api/gs/ranking", params] as const;
export const getGetGsFigureQueryKey = (id: number) =>
  ["/api/gs/figures", id] as const;
export interface Figure {
  domain: string;
  id: number;
  name: string;
  imageUrl: string;
  bio: string;
  nationality: string;
  rank: number;
  recentVotes: number;
  voteTrend: number;
  votes: number;
  domainLabel: string;
}
export interface Domain {
  figureCount: number;
  id: string;
  label: string;
  icon: string;
  totalVotes: number;
}
export interface Ranking {
  domain: string;
  domainLabel: string;
  icon: string;
  figures: Figure[];
}
export interface Article {
  id: number;
  title: string;
  summary: string;
  source: string;
  imageUrl: string;
  publishedAt: string;
  domainLabel: string;
  isBreaking: boolean;
}
export interface Tradition {
  id: number;
  name: string;
  country: string;
  category: string;
  description: string;
  imageUrl: string;
  period: string;
  isArchaeological: boolean;
}
export interface TickerItem {
  id: number;
  domain: string;
  text: string;
  isBreaking: boolean;
}
async function rows<T>(table: string, params?: Params, order = "id", ascending = true): Promise<T[]> {
  if (!supabase) {
    let data = [...(mockTables[table] ?? [])] as Record<string, unknown>[];
    for (const field of ["domain", "category", "country"]) {
      if (params?.[field]) data = data.filter(row => row[field] === params[field]);
    }
    const limit = Number(params?.limit);
    if (Number.isSafeInteger(limit) && limit > 0) data = data.slice(0, Math.min(limit, 100));
    return data as T[];
  }
  let query = supabase.from(table).select("*").order(order, { ascending });
  for (const field of ["domain", "category", "country"]) {
    if (params?.[field]) query = query.eq(field, params[field]);
  }
  if (params?.limit) {
    const limit = Number(params.limit);
    if (Number.isSafeInteger(limit) && limit > 0) query = query.limit(Math.min(limit, 100));
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase ${table}: ${error.message}`);
  return (data ?? []) as T[];
}
export const useGetGsDomains = () => useQuery({
  queryKey: ["/api/gs/domains"],
  queryFn: async () => ({ domains: await rows<Domain>("gs_domains") }),
});
export const useGetGsRanking = () => useQuery({
  queryKey: getGetGsRankingQueryKey(),
  queryFn: async () => {
    const [domains, figures] = await Promise.all([
      rows<Domain>("gs_domains"), rows<Figure>("gs_figures", undefined, "rank"),
    ]);
    return {
      ranking: domains.map(domain => ({ domain: domain.id, domainLabel: domain.label,
        icon: domain.icon, figures: figures.filter(figure => figure.domain === domain.id) })),
      updatedAt: "", // No authoritative ranking update time exists in this checkout.
    };
  },
});
export const useGetGsFigures = (params?: Params) => useQuery({
  queryKey: getGetGsFiguresQueryKey(params),
  queryFn: async () => ({ figures: await rows<Figure>("gs_figures", params, "rank") }),
});
export const useGetGsNews = (params?: Params) => useQuery({
  queryKey: ["/api/gs/news", params],
  queryFn: async () => ({ articles: await rows<Article>("gs_articles", params, "publishedAt", false) }),
});
export const useGetGsTraditions = (params?: Params) => useQuery({
  queryKey: ["/api/gs/traditions", params],
  queryFn: async () => ({ traditions: await rows<Tradition>("gs_traditions", params) }),
});
export const useGetGsTicker = () => useQuery({
  queryKey: ["/api/gs/ticker"],
  queryFn: async () => ({ items: await rows<TickerItem>("gs_ticker") }),
});
export const useGetGsFigure = (id: number) => useQuery<Figure | null, Error>({
  queryKey: getGetGsFigureQueryKey(id),
  queryFn: async () => {
    if (!supabase) return mockFigures.find(figure => figure.id === id) ?? null;
    const { data, error } = await supabase.from("gs_figures").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase gs_figures: ${error.message}`);
    return data as Figure | null;
  },
});
export const useGetRecoveryCodeStatus = (
  options?: Options<OfflineRecoveryStatus>,
) =>
  useQuery<OfflineRecoveryStatus, Error>({
    queryKey: getGetRecoveryCodeStatusQueryKey(),
    queryFn: unavailable,
    retry: false,
    ...options?.query,
  });
export const useGetExhaustedClipThumbnails = (
  params?: Params,
  options?: Options<{
    clips: ExhaustedClipThumbnail[];
    nextBefore: number | null;
    maxAttempts: number;
  }>,
) =>
  useQuery({
    queryKey: getGetExhaustedClipThumbnailsQueryKey(params),
    queryFn: unavailable,
    retry: false,
    ...options?.query,
  });
export const useVoteGsFigure = () =>
  useMutation<
    { newVotes: number; newRank: number },
    Error,
    { figureId: number }
  >({ mutationFn: async ({ figureId }) => {
    if (supabase) return unavailable(); // No public write policy on the optional real DB.
    const figure = mockFigures.find(figure => figure.id === figureId);
    if (!figure) throw new Error("Demo figure not found");
    figure.votes += 1;
    return { newVotes: figure.votes, newRank: figure.rank };
  } });
export const useSendArenaWithdrawRequest = () =>
  useMutation<{ content: string }, Error, { data: { gameId: string } }>({
    mutationFn: unavailable,
  });
export const useRequeueClipThumbnail = () =>
  useMutation<unknown, Error, { id: number }>({ mutationFn: unavailable });
export async function generateRecoveryCode(
  _data: { currentPassword: string },
  _options?: RequestInit,
): Promise<{ code: string; expiresAt: string }> {
  return unavailable();
}
export async function removeRecoveryCode(
  _data: { currentPassword: string },
  _options?: RequestInit,
): Promise<OfflineRecoveryStatus> {
  return unavailable();
}
export async function redeemRecoveryCode(
  _data: { code: string; newPassword: string },
  _options?: RequestInit,
): Promise<OfflineRecoveryResult> {
  return unavailable();
}
export async function listMessagingSubscriptions(): Promise<
  { id: number; username: string; hasActiveSubscription: boolean }[]
> {
  return unavailable();
}
export async function updateMessagingSubscription(
  _id: number,
  _data: { hasActiveSubscription: boolean },
): Promise<never> {
  return unavailable();
}
