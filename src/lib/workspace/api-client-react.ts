/** Standalone MOCK backend: reads are empty; mutations never claim success. */
import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
export const WORKSPACE_MOCK_MODE = true;
export const MOCK_UNAVAILABLE =
  "Backend unavailable in standalone mock mode. No changes were saved.";
export async function unavailable(): Promise<never> {
  throw new Error(MOCK_UNAVAILABLE);
}
type Params = Record<string, string | number | boolean | undefined>;
type Options<T> = {
  query?: Partial<UseQueryOptions<T, Error>>;
  request?: RequestInit;
};
function useEmpty<T>(key: readonly unknown[], data: T, options?: Options<T>) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: async () => data,
    ...options?.query,
  });
}
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
export const useGetGsDomains = () =>
  useEmpty(["mock", "domains"], { domains: [] as Domain[] });
export const useGetGsRanking = () =>
  useEmpty(getGetGsRankingQueryKey(), {
    ranking: [] as Ranking[],
    updatedAt: "",
  });
export const useGetGsFigures = (params?: Params) =>
  useEmpty(getGetGsFiguresQueryKey(params), { figures: [] as Figure[] });
export const useGetGsNews = (params?: Params) =>
  useEmpty(["mock", "news", params], { articles: [] as Article[] });
export const useGetGsTraditions = (params?: Params) =>
  useEmpty(["mock", "traditions", params], { traditions: [] as Tradition[] });
export const useGetGsTicker = () =>
  useEmpty(["mock", "ticker"], { items: [] as TickerItem[] });
// A missing figure follows the page's existing not-found branch.
export const useGetGsFigure = (id: number) =>
  useEmpty<Figure | null>(getGetGsFigureQueryKey(id), null);
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
  useEmpty(
    getGetExhaustedClipThumbnailsQueryKey(params),
    { clips: [] as ExhaustedClipThumbnail[], nextBefore: null, maxAttempts: 0 },
    options,
  );
export const useVoteGsFigure = () =>
  useMutation<
    { newVotes: number; newRank: number },
    Error,
    { figureId: number }
  >({ mutationFn: unavailable });
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
  return [];
}
export async function updateMessagingSubscription(
  _id: number,
  _data: { hasActiveSubscription: boolean },
): Promise<never> {
  return unavailable();
}
