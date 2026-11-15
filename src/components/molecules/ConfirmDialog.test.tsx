import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      trigger={<button>Remove</button>}
      title="Remove this?"
      description="This cannot be undone."
      confirmLabel="Remove it"
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm };
}

describe("ConfirmDialog", () => {
  it("stays closed until the trigger is pressed", () => {
    renderDialog();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks the question with a title and a description", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Remove this?" });
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("confirms, then closes", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(await screen.findByRole("button", { name: "Remove it" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does nothing when cancelled", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does nothing when closed with Escape", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("can use a custom cancel label", async () => {
    const user = userEvent.setup();
    renderDialog({ cancelLabel: "Keep it" });

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByRole("button", { name: "Keep it" })).toBeInTheDocument();
  });

  it("marks the confirm button as destructive when asked", async () => {
    const user = userEvent.setup();
    renderDialog({ destructive: true });

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByRole("button", { name: "Remove it" })).toHaveAttribute("data-variant", "destructive");
  });
});
