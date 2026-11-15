import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("is named by its label, even though it only shows an icon", () => {
    render(<IconButton label="Delete" icon={<svg data-testid="icon" />} />);

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("hides the icon from screen readers", () => {
    render(<IconButton label="Delete" icon={<svg data-testid="icon" />} />);

    expect(screen.getByTestId("icon").closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("shows the label as a tooltip", () => {
    render(<IconButton label="Delete" icon={<svg />} />);

    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("title", "Delete");
  });

  it("calls onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IconButton label="Delete" icon={<svg />} onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("cannot be clicked when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IconButton label="Delete" icon={<svg />} onClick={onClick} disabled />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
