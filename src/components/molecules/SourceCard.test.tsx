import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceCard } from "./SourceCard";

const long = "A very long passage. ".repeat(20);

describe("SourceCard", () => {
  it("shows the number, the file name and the passage", () => {
    render(<SourceCard number={3} filename="leave.md" content="20 days of leave." />);

    expect(screen.getByRole("article", { name: "Source 3: leave.md" })).toBeInTheDocument();
    expect(screen.getByText("leave.md")).toBeInTheDocument();
    expect(screen.getByText("20 days of leave.")).toBeInTheDocument();
  });

  it("says when the answer cites it", () => {
    const { rerender } = render(<SourceCard number={1} filename="a.md" content="x" />);
    expect(screen.queryByText("Cited")).not.toBeInTheDocument();

    rerender(<SourceCard number={1} filename="a.md" content="x" cited />);
    expect(screen.getByText("Cited")).toBeInTheDocument();
  });

  it("has no expand button for a short passage", () => {
    render(<SourceCard number={1} filename="a.md" content="Short." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shortens a long passage and expands it on request", async () => {
    const user = userEvent.setup();
    render(<SourceCard number={1} filename="a.md" content={long} />);
    const text = screen.getByText(/A very long passage/);
    expect(text).toHaveClass("line-clamp-3");

    await user.click(screen.getByRole("button", { name: "Show more" }));

    expect(text).not.toHaveClass("line-clamp-3");
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("can be found by id, for scrolling to it", () => {
    render(<SourceCard id="source-1" number={1} filename="a.md" content="x" />);

    expect(document.getElementById("source-1")).not.toBeNull();
  });

  it("flashes only while it is highlighted", () => {
    const { rerender } = render(<SourceCard number={1} filename="a.md" content="x" />);
    expect(screen.getByRole("article")).not.toHaveClass("animate-source-flash");

    rerender(<SourceCard number={1} filename="a.md" content="x" highlighted />);
    expect(screen.getByRole("article")).toHaveClass("animate-source-flash");
  });
});
