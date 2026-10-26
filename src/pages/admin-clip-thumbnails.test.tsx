/**
 * Targeted state tests for the admin clip-thumbnail repair page.
 * Focus: admin gating (no privileged fetch for non-admins), list/empty/frozen
 * rendering, and requeue error mapping for 409/429.
 */
import { act, cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ── Mocks ─────────────────────────────────────────────────────────────────────
const authState: { user: { id?: number; isAdmin?: boolean } | null; loading: boolean } = {
  user: { id: 1, isAdmin: true },
  loading: false,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/clips/thumbnails", vi.fn()],
}));

const toastMock = vi.fn();
vi.mock("@workspace/gdna-ds/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const getQueryState = vi.fn();
const mutateMock = vi.fn();
let mutationPending = false;
const refetchMock = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  getGetExhaustedClipThumbnailsQueryKey: (p: unknown) => ["/api/admin/clips/thumbnails/exhausted", p],
  useGetExhaustedClipThumbnails: (_params: unknown, options: { query?: { enabled?: boolean } }) => {
    return getQueryState(options?.query?.enabled);
  },
  useRequeueClipThumbnail: () => ({ mutate: mutateMock, isPending: mutationPending }),
}));

import AdminClipThumbnailsPage from "./admin-clip-thumbnails";

let queryClient: QueryClient;

function wrapper() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

let PageWrapper: ({ children }: { children: ReactNode }) => ReturnType<typeof createElement>;

function renderPage() {
  PageWrapper = wrapper();
  return render(createElement(PageWrapper, null, createElement(AdminClipThumbnailsPage)));
}

const clip = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 42,
  title: "Broken Preview",
  username: "creator",
  createdAt: "2024-01-01T00:00:00.000Z",
  thumbnailRetryAttempts: 8,
  thumbnailRetryAt: "2024-01-02T00:00:00.000Z",
  isFrozen: false,
  ...over,
});

const baseQuery = () => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: refetchMock,
});

beforeEach(() => {
  authState.user = { id: 1, isAdmin: true };
  authState.loading = false;
  mutationPending = false;
  toastMock.mockReset();
  mutateMock.mockReset();
  refetchMock.mockReset();
  getQueryState.mockReset();
});

afterEach(() => cleanup());

describe("AdminClipThumbnailsPage — access gating", () => {
  it("does not enable the privileged query for non-admins and shows access denied", () => {
    authState.user = { isAdmin: false };
    getQueryState.mockReturnValue(baseQuery());
    renderPage();
    expect(screen.getByText(/Admin access required/i)).toBeTruthy();
    // The query hook receives enabled=false for non-admins.
    expect(getQueryState).toHaveBeenCalledWith(false);
  });

  it("does not enable the query for unauthenticated (null) users", () => {
    authState.user = null;
    getQueryState.mockReturnValue(baseQuery());
    renderPage();
    expect(getQueryState).toHaveBeenCalledWith(false);
  });

  it("enables the query only when auth resolved and user is admin", () => {
    getQueryState.mockReturnValue({ ...baseQuery(), isLoading: true });
    renderPage();
    expect(getQueryState).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("state-loading")).toBeTruthy();
  });
});

describe("AdminClipThumbnailsPage — list states", () => {
  it("renders the empty state when there are no exhausted clips", () => {
    getQueryState.mockReturnValue({ ...baseQuery(), data: { clips: [], nextBefore: null, maxAttempts: 8 } });
    renderPage();
    expect(screen.getByTestId("state-empty")).toBeTruthy();
  });

  it("renders an error state with retry", () => {
    getQueryState.mockReturnValue({ ...baseQuery(), isError: true, error: new Error("boom") });
    renderPage();
    expect(screen.getByTestId("state-error")).toBeTruthy();
    fireEvent.click(screen.getByTestId("button-retry"));
    expect(refetchMock).toHaveBeenCalled();
  });

  it("disables the requeue button for frozen rows", () => {
    getQueryState.mockReturnValue({
      ...baseQuery(),
      data: { clips: [clip({ id: 7, isFrozen: true })], nextBefore: null, maxAttempts: 8 },
    });
    renderPage();
    const btn = screen.getByTestId("button-requeue-7") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByTestId("badge-frozen-7")).toBeTruthy();
  });

  it("shows attempts over max and identity", () => {
    getQueryState.mockReturnValue({
      ...baseQuery(),
      data: { clips: [clip()], nextBefore: null, maxAttempts: 8 },
    });
    renderPage();
    expect(screen.getByTestId("text-clip-attempts-42").textContent).toContain("8 / 8");
    expect(screen.getByTestId("text-clip-owner-42").textContent).toBe("creator");
  });
});

describe("AdminClipThumbnailsPage — requeue confirmation & errors", () => {
  function openDialog() {
    getQueryState.mockReturnValue({
      ...baseQuery(),
      data: { clips: [clip()], nextBefore: null, maxAttempts: 8 },
    });
    renderPage();
    fireEvent.click(screen.getByTestId("button-requeue-42"));
  }

  it("requires explicit confirmation and passes the single clip id", async () => {
    openDialog();
    expect(screen.getByTestId("dialog-requeue")).toBeTruthy();
    fireEvent.click(screen.getByTestId("button-requeue-confirm"));
    expect(mutateMock).toHaveBeenCalledWith({ id: 42 }, expect.any(Object));
  });

  it("maps a 409 conflict to an actionable message incl. worker-active reason", () => {
    mutateMock.mockImplementation((_vars, opts) => {
      opts.onError({ status: 409, message: "conflict" });
    });
    openDialog();
    fireEvent.click(screen.getByTestId("button-requeue-confirm"));
    const text = screen.getByTestId("text-requeue-error").textContent ?? "";
    expect(text).toMatch(/409/);
    expect(text).toMatch(/worker/i);
    expect(text).toMatch(/retry later/i);
  });

  it("maps a 429 rate limit to an actionable message", () => {
    mutateMock.mockImplementation((_vars, opts) => {
      opts.onError({ status: 429, message: "slow down" });
    });
    openDialog();
    fireEvent.click(screen.getByTestId("button-requeue-confirm"));
    expect(screen.getByTestId("text-requeue-error").textContent).toMatch(/429/);
  });

  it("on success toasts 'queued not generated', patches the page immediately, and invalidates all exhausted pages", async () => {
    getQueryState.mockReturnValue({
      ...baseQuery(),
      data: { clips: [clip({ id: 42 }), clip({ id: 43 })], nextBefore: null, maxAttempts: 8 },
    });
    renderPage();

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const setDataSpy = vi.spyOn(queryClient, "setQueryData");

    mutateMock.mockImplementation((_vars, opts) =>
      opts.onSuccess({ id: 42, thumbnailRetryAttempts: 0, thumbnailRetryAt: "" }),
    );
    fireEvent.click(screen.getByTestId("button-requeue-42"));
    fireEvent.click(screen.getByTestId("button-requeue-confirm"));

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const arg = toastMock.mock.calls[0][0];
    expect(`${arg.title} ${arg.description}`).toMatch(/queued/i);
    expect(arg.description).toMatch(/not generated|5-minute/i);

    // Immediate visible update: current page patched in-place.
    expect(setDataSpy).toHaveBeenCalled();
    // All exhausted-list pages invalidated (predicate-based), not a single refetch.
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) }),
    );
  });
});

describe("AdminClipThumbnailsPage — cache hygiene across auth changes", () => {
  it("evicts privileged queries when access identity changes (admin -> non-admin)", async () => {
    getQueryState.mockReturnValue({
      ...baseQuery(),
      data: { clips: [clip()], nextBefore: null, maxAttempts: 8 },
    });
    const { rerender } = renderPage();

    const cancelSpy = vi.spyOn(queryClient, "cancelQueries");
    const removeSpy = vi.spyOn(queryClient, "removeQueries");

    // Downgrade to non-admin and re-render the SAME tree so the component
    // instance (and its effect refs) are preserved.
    authState.user = { id: 1, isAdmin: false };
    await act(async () => {
      rerender(createElement(PageWrapper, null, createElement(AdminClipThumbnailsPage)));
    });

    expect(removeSpy).toHaveBeenCalled();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
