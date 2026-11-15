import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import { DocumentsProvider, useDocumentsContext } from "./DocumentsProvider";

const fetchMock = vi.fn();
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function Reader({ name }: { name: string }) {
  const { state } = useDocumentsContext();
  return <p>{`${name}: ${state.status === "ready" ? state.documents.length : state.status}`}</p>;
}

describe("DocumentsProvider", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lets every part of the page see the same list, loaded only once", async () => {
    fetchMock.mockResolvedValue(json({ documents: [{ id: "1", filename: "a.md", chunkCount: 1, createdAt: "2026-11-15T10:00:00.000Z" }] }));

    render(
      <DocumentsProvider>
        <Reader name="sidebar" />
        <Reader name="chat" />
      </DocumentsProvider>,
    );

    expect(await screen.findByText("sidebar: 1")).toBeInTheDocument();
    expect(screen.getByText("chat: 1")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives a clear error when used outside the provider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useDocumentsContext())).toThrow("inside <DocumentsProvider>");
    quiet.mockRestore();
  });
});
