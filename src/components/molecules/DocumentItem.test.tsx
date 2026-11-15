import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentItem } from "./DocumentItem";
import type { RemoveResult } from "@/hooks/useDocuments";

const doc = { id: "5", filename: "annual-leave-policy.md", chunkCount: 3, createdAt: "2026-11-15T10:00:00.000Z" };

// The row is a list item, so it is rendered inside a list.
function renderItem(onDelete = vi.fn<(id: string) => Promise<RemoveResult>>(async () => ({ ok: true }))) {
  render(
    <ul>
      <DocumentItem document={doc} onDelete={onDelete} />
    </ul>,
  );
  return { onDelete };
}

describe("DocumentItem", () => {
  it("shows the file name, the number of parts and a date", () => {
    renderItem();

    expect(screen.getByText("annual-leave-policy.md")).toBeInTheDocument();
    expect(screen.getByText(/3 parts · \w+ \d+/)).toBeInTheDocument();
  });

  it("has a delete button named after the document", () => {
    renderItem();

    expect(screen.getByRole("button", { name: "Delete annual-leave-policy.md" })).toBeInTheDocument();
  });

  it("asks first and does not delete before the user confirms", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderItem();

    await user.click(screen.getByRole("button", { name: "Delete annual-leave-policy.md" }));

    expect(await screen.findByRole("alertdialog", { name: "Delete annual-leave-policy.md?" })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("deletes the document after confirmation", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderItem();

    await user.click(screen.getByRole("button", { name: "Delete annual-leave-policy.md" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith("5");
  });

  it("does not delete when the user cancels", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderItem();

    await user.click(screen.getByRole("button", { name: "Delete annual-leave-policy.md" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("is marked busy while the delete request runs", async () => {
    let finish: (result: RemoveResult) => void = () => {};
    const onDelete = vi.fn<(id: string) => Promise<RemoveResult>>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    renderItem(onDelete);

    await user.click(screen.getByRole("button", { name: "Delete annual-leave-policy.md" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(screen.getByRole("listitem")).toHaveAttribute("aria-busy", "true");
    finish({ ok: true });
  });

  it("shows the reason and becomes usable again when deleting fails", async () => {
    const onDelete = vi.fn<(id: string) => Promise<RemoveResult>>(async () => ({
      ok: false,
      message: "Could not delete the document. Try again.",
    }));
    const user = userEvent.setup();
    renderItem(onDelete);

    await user.click(screen.getByRole("button", { name: "Delete annual-leave-policy.md" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete the document. Try again.");
    await waitFor(() => expect(screen.getByRole("listitem")).toHaveAttribute("aria-busy", "false"));
  });
});
