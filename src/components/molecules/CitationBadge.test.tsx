import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CitationBadge } from "./CitationBadge";

describe("CitationBadge", () => {
  it("shows the number and is named after the source it opens", () => {
    render(<CitationBadge number={3} />);

    expect(screen.getByRole("button", { name: "Show source 3" })).toHaveTextContent("3");
  });

  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<CitationBadge number={3} onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Show source 3" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("tells assistive technology when its source is the open one", () => {
    const { rerender } = render(<CitationBadge number={3} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");

    rerender(<CitationBadge number={3} active />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("can be used inside a form without submitting it", () => {
    render(<CitationBadge number={1} />);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
