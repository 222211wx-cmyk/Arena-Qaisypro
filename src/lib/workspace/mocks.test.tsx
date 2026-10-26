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
describe("explicit standalone mocks", () => {
  it("returns empty read data without a network request", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useGetGsDomains(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ domains: [] });
    expect(await listMessagingSubscriptions()).toEqual([]);
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
  it("routes vote mutations through the error path, never success", async () => {
    const { result } = renderHook(() => useVoteGsFigure(), { wrapper });
    await expect(result.current.mutateAsync({ figureId: 1 })).rejects.toThrow(
      MOCK_UNAVAILABLE,
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isSuccess).toBe(false);
  });
});
