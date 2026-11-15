import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentsPanel } from "./DocumentsPanel";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const doc = (id: string, filename: string) => ({ id, filename, chunkCount: 2, createdAt: "2026-11-15T10:00:00.000Z" });

describe("DocumentsPanel", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the upload area and the documents with a count", async () => {
    fetchMock.mockResolvedValue(json({ documents: [doc("1", "leave.md"), doc("2", "payroll.md")] }));
    render(<DocumentsPanel />);

    expect(screen.getByLabelText("Add a document", { selector: "input" })).toBeInTheDocument();
    expect(await screen.findByText("leave.md")).toBeInTheDocument();
    expect(screen.getByText("payroll.md")).toBeInTheDocument();
    expect(screen.getByLabelText("2 documents")).toBeInTheDocument();
  });

  it("shows the empty invitation and no count when there are no documents", async () => {
    fetchMock.mockResolvedValue(json({ documents: [] }));
    render(<DocumentsPanel />);

    expect(await screen.findByRole("heading", { name: "No documents yet" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/documents$/)).not.toBeInTheDocument();
  });

  it("adds an uploaded file to the list without a page reload", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ documents: [] }))
      .mockResolvedValueOnce(json({ documentId: "7", chunkCount: 1 }, 201))
      .mockResolvedValueOnce(json({ documents: [doc("7", "new.md")] }));
    const user = userEvent.setup();
    render(<DocumentsPanel />);
    await screen.findByRole("heading", { name: "No documents yet" });

    await user.upload(screen.getByLabelText("Add a document", { selector: "input" }), new File(["hi"], "new.md"));

    const list = await screen.findByRole("list", { name: "Documents" });
    expect(within(list).getByText("new.md")).toBeInTheDocument();
  });

  it("deletes a document after confirmation and removes it from the list", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ documents: [doc("1", "leave.md"), doc("2", "payroll.md")] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    render(<DocumentsPanel />);
    await screen.findByText("leave.md");

    await user.click(screen.getByRole("button", { name: "Delete leave.md" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await vi.waitFor(() => expect(screen.queryByText("leave.md")).not.toBeInTheDocument());
    expect(screen.getByText("payroll.md")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/documents/1", { method: "DELETE" });
  });

  it("shows an error with a retry when the list cannot be loaded", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "x" }, 500)).mockResolvedValueOnce(json({ documents: [doc("1", "leave.md")] }));
    const user = userEvent.setup();
    render(<DocumentsPanel />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your documents.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("leave.md")).toBeInTheDocument();
  });
});
