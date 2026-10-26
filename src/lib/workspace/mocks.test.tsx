import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  generateRecoveryCode,
  redeemRecoveryCode,
  removeRecoveryCode,
  updateMessagingSubscription,
  useGetGsDomains,
  useVoteGsFigure,
  listMessagingSubscriptions,
  MOCK_UNAVAILABLE,
} from "./api-client-react";
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
    }
  >
    {children}
  </QueryClientProvider>
);
describe("Supabase reads and unsupported legacy operations", () => {
  it("uses sample data without a Supabase key or network request", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useGetGsDomains(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.domains.length).toBeGreaterThan(0);
    await expect(listMessagingSubscriptions()).rejects.toThrow(MOCK_UNAVAILABLE);
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it("never fabricates recovery codes, password resets or subscription changes", async () => {
    await expect(
      generateRecoveryCode({ currentPassword: "test" }),
    ).rejects.toThrow(MOCK_UNAVAILABLE);
    await expect(
      removeRecoveryCode({ currentPassword: "test" }),
    ).rejects.toThrow(MOCK_UNAVAILABLE);
    await expect(
      redeemRecoveryCode({ code: "test", newPassword: "test" }),
    ).rejects.toThrow(MOCK_UNAVAILABLE);
    await expect(
      updateMessagingSubscription(1, { hasActiveSubscription: true }),
    ).rejects.toThrow(MOCK_UNAVAILABLE);
  });
  it("records demo votes locally", async () => {
    const { result } = renderHook(() => useVoteGsFigure(), { wrapper });
    const data = await result.current.mutateAsync({ figureId: 1 });
    expect(data.newVotes).toBeGreaterThan(0);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
