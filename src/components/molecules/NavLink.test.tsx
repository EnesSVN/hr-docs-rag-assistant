import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavLink } from "./NavLink";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("NavLink", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("points to its page", () => {
    render(<NavLink href="/upload">Upload</NavLink>);
    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute("href", "/upload");
  });

  it("marks the current page for screen readers", () => {
    pathname.current = "/upload";
    render(<NavLink href="/upload">Upload</NavLink>);
    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute("aria-current", "page");
  });

  it("does not mark other pages", () => {
    pathname.current = "/";
    render(<NavLink href="/upload">Upload</NavLink>);
    expect(screen.getByRole("link", { name: "Upload" })).not.toHaveAttribute("aria-current");
  });
});
