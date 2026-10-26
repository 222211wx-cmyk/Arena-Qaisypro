import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../supabase", () => ({ supabase: { from } }));
import { useGetGsDomains } from "./api-client-react";
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);
describe("Supabase read integration", () => {
  it("returns stored domains rather than a mock empty list", async () => {
    const domains = [{ id: "sports", label: "Sports", icon: "", figureCount: 1, totalVotes: 2 }];
    const order = vi.fn().mockResolvedValue({ data: domains, error: null });
    from.mockReturnValue({ select: () => ({ order }) });
    const { result } = renderHook(() => useGetGsDomains(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(from).toHaveBeenCalledWith("gs_domains");
    expect(result.current.data).toEqual({ domains });
  });
  it("surfaces a database failure instead of reporting an empty database", async () => {
    from.mockReturnValue({ select: () => ({ order: () => Promise.resolve({ data: null, error: { message: "table missing" } }) }) });
    const { result } = renderHook(() => useGetGsDomains(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Supabase gs_domains: table missing");
  });
});
