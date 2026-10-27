import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi, afterEach, describe, expect, it } from "vitest";
import Register from "./register";

const { register } = vi.hoisted(() => ({ register: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { cleanup(); register.mockClear(); });
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    register,
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useSearch: () => "",
  useLocation: () => ["/register", vi.fn()],
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

describe("Register", () => {
  it("shows the default Arabic account-recovery policy before account creation", () => {
    render(<Register />);

    const notice = screen.getByTestId("notice-password-recovery");
    expect(notice).toBeVisible();
    expect(notice).toHaveTextContent(
      "الاستعادة بالهاتف اختيارية",
    );
    expect(notice).toHaveTextContent(
      "وثّق هاتف استعادة في الإعدادات قبل فقدان الوصول",
    );
    expect(notice).not.toHaveTextContent("register.recovery");
    expect(notice).not.toHaveTextContent("recovery");
  });
  it("creates an account only after two confirmations and allows editing", async () => {
    const { container } = render(<Register />);
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "Citizen" } });
    fireEvent.change(screen.getByTestId("input-birth-date"), { target: { value: "1990-01-01" } });
    fireEvent.change(screen.getByTestId("input-password"), { target: { value: "StrongPassword123!" } });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText("هل معلوماتك صحيحة؟")).toBeVisible();
    expect(screen.queryByText("StrongPassword123!")).toBeNull();
    fireEvent.submit(form);
    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText("تأكيد مرة ثانية - هل أنت متأكد؟")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "لا، تعديل المعلومات" }));
    expect(screen.getByTestId("input-username")).toBeVisible();
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(register).toHaveBeenCalledExactlyOnceWith("Citizen", "StrongPassword123!", "1990-01-01"));
  });

});