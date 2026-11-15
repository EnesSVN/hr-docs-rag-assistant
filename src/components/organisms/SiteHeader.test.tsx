import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SiteHeader } from "./SiteHeader";

vi.mock("next/navigation", () => ({ usePathname: () => "/upload" }));

describe("SiteHeader", () => {
  it("shows the app name and the main navigation", () => {
    render(<SiteHeader />);

    expect(screen.getByText("HR Assistant")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Chat" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Upload" })).toHaveAttribute("href", "/upload");
  });

  it("marks the page we are on", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Chat" })).not.toHaveAttribute("aria-current");
  });
});
