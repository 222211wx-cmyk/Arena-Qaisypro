import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./home";
afterEach(cleanup);
describe("Arena mobile landing", () => {
  it("renders the Arabic hero, search and six services in the requested order", () => {
    const { container } = render(<Home />);
    expect(container.querySelector(".arena-home")?.getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("الإمبراطورية الخالدة");
    expect(screen.getByRole("link", { name: "ادخل إلى المركز" }).getAttribute("href")).toBe("/hub");
    expect(screen.getAllByRole("article").map(card => card.getAttribute("aria-label"))).toEqual([
      "GDN-SMART", "GDN-FIT", "GDN-CINE", "GDN-ARENA", "GDN-TO", "GDN-MUSIC",
    ]);
    expect(screen.getAllByRole("link", { name: /^ابدأ/ }).map(link => link.getAttribute("href"))).toEqual([
      "/smart", "/sport", "/cinema", "/games", "/fortress", "/music",
    ]);
  });
  it("filters services and handles an empty result without dummy data", () => {
    render(<Home />);
    const search = screen.getByRole("searchbox", { name: "بحث" });
    fireEvent.change(search, { target: { value: "MUSIC" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "السينما" } });
    expect(screen.getByRole("article").getAttribute("aria-label")).toBe("GDN-CINE");
    fireEvent.change(search, { target: { value: "missing" } });
    expect(screen.getByRole("status").textContent).toBe("لا توجد نتائج");
    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });
});
