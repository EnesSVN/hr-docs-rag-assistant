import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoadingButton } from "./LoadingButton";

describe("LoadingButton", () => {
  it("behaves like a normal button when not loading", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<LoadingButton onClick={onClick}>Save</LoadingButton>);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy", "true");
  });

  it("is disabled and busy while loading, and cannot be clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <LoadingButton loading onClick={onClick}>
        Save
      </LoadingButton>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows the loading text instead of the label while loading", () => {
    render(
      <LoadingButton loading loadingText="Saving...">
        Save
      </LoadingButton>,
    );
    expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();
  });

  it("keeps the normal label while loading when no loading text is given", () => {
    render(<LoadingButton loading>Save</LoadingButton>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("stays disabled when disabled is set and it is not loading", () => {
    render(<LoadingButton disabled>Save</LoadingButton>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
