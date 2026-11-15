import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentList } from "./DocumentList";
import type { DocumentsState } from "@/hooks/useDocuments";

const docs = [
  { id: "2", filename: "payroll.md", chunkCount: 2, createdAt: "2026-11-15T10:00:00.000Z" },
  { id: "1", filename: "leave.md", chunkCount: 1, createdAt: "2026-11-14T10:00:00.000Z" },
];

function renderList(state: DocumentsState, handlers = { onDelete: vi.fn(), onRetry: vi.fn() }) {
  render(<DocumentList state={state} {...handlers} />);
  return handlers;
}

describe("DocumentList", () => {
  it("shows a busy placeholder while loading", () => {
    renderList({ status: "loading" });

    expect(screen.getByRole("status", { name: "Loading documents" })).toHaveAttribute("aria-busy", "true");
  });

  it("shows the error and a way to try again", async () => {
    const user = userEvent.setup();
    const { onRetry } = renderList({ status: "error", message: "Could not load your documents." });

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your documents.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("invites the user to add a document when there are none", () => {
    renderList({ status: "ready", documents: [] });

    expect(screen.getByRole("heading", { name: "No documents yet" })).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("lists the documents in the given order", () => {
    renderList({ status: "ready", documents: docs });

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("payroll.md");
    expect(items[1]).toHaveTextContent("leave.md");
  });

  it("passes the delete handler down to each row", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => ({ ok: true as const }));
    renderList({ status: "ready", documents: docs }, { onDelete, onRetry: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Delete leave.md" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith("1");
  });
});
