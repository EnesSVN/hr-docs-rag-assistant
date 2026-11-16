import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "./TopBar";
import { mockMatchMedia } from "@/test/mock-match-media";

describe("TopBar", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("shows the page title as the main heading", () => {
    render(<TopBar title="Ask your documents" onMenuClick={() => {}} />);

    expect(screen.getByRole("heading", { level: 1, name: "Ask your documents" })).toBeInTheDocument();
  });

  it("has a button that opens the sidebar", async () => {
    const onMenuClick = vi.fn();
    const user = userEvent.setup();
    render(<TopBar title="Title" onMenuClick={onMenuClick} />);

    await user.click(screen.getByRole("button", { name: "Open sidebar" }));

    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it("shows the menu button only on small screens", () => {
    render(<TopBar title="Title" onMenuClick={() => {}} />);

    expect(screen.getByRole("button", { name: "Open sidebar" })).toHaveClass("md:hidden");
  });

  it("has the theme switch", () => {
    render(<TopBar title="Title" onMenuClick={() => {}} />);

    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
  });

  it("shows the page's own buttons next to the theme switch", () => {
    render(<TopBar title="Title" onMenuClick={() => {}} actions={<button>New chat</button>} />);

    expect(screen.getByRole("button", { name: "New chat" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
  });

  it("works without page buttons", () => {
    render(<TopBar title="Title" onMenuClick={() => {}} />);

    expect(screen.queryByRole("button", { name: "New chat" })).not.toBeInTheDocument();
  });
});
