// Named .test.tsx so it runs in the jsdom ("dom") project, which renderHook needs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDocuments } from "./useDocuments";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const one = { id: "1", filename: "a.md", chunkCount: 2, createdAt: "2026-11-15T10:00:00.000Z" };
const two = { id: "2", filename: "b.md", chunkCount: 1, createdAt: "2026-11-15T11:00:00.000Z" };

describe("useDocuments", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts loading, then shows the documents", async () => {
    fetchMock.mockResolvedValue(json({ documents: [one] }));
    const { result } = renderHook(() => useDocuments());

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", documents: [one] }));
    expect(fetchMock).toHaveBeenCalledWith("/api/documents");
  });

  it("shows an error when the first load fails, and loads again on retry", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "x" }, 500)).mockResolvedValueOnce(json({ documents: [one] }));
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    act(() => result.current.retry());
    expect(result.current.state).toEqual({ status: "loading" });

    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", documents: [one] }));
  });

  it("shows an error when the request itself fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => expect(result.current.state).toEqual({ status: "error", message: "Could not load your documents." }));
  });

  it("refresh picks up new documents", async () => {
    fetchMock.mockResolvedValueOnce(json({ documents: [one] })).mockResolvedValueOnce(json({ documents: [two, one] }));
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.state).toEqual({ status: "ready", documents: [two, one] });
  });

  it("keeps the list it has when a refresh fails", async () => {
    fetchMock.mockResolvedValueOnce(json({ documents: [one] })).mockRejectedValueOnce(new TypeError("offline"));
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.state).toEqual({ status: "ready", documents: [one] });
  });

  describe("remove", () => {
    async function ready() {
      fetchMock.mockResolvedValueOnce(json({ documents: [two, one] }));
      const hook = renderHook(() => useDocuments());
      await waitFor(() => expect(hook.result.current.state.status).toBe("ready"));
      return hook;
    }

    it("sends DELETE and takes the document out of the list", async () => {
      const { result } = await ready();
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      let outcome;
      await act(async () => {
        outcome = await result.current.remove("2");
      });

      expect(outcome).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenLastCalledWith("/api/documents/2", { method: "DELETE" });
      expect(result.current.state).toEqual({ status: "ready", documents: [one] });
    });

    it("treats 'not found' as success, because the document is gone either way", async () => {
      const { result } = await ready();
      fetchMock.mockResolvedValueOnce(json({ error: "document not found" }, 404));

      let outcome;
      await act(async () => {
        outcome = await result.current.remove("2");
      });

      expect(outcome).toEqual({ ok: true });
      expect(result.current.state).toEqual({ status: "ready", documents: [one] });
    });

    it("reports a server error and keeps the document in the list", async () => {
      const { result } = await ready();
      fetchMock.mockResolvedValueOnce(json({ error: "boom" }, 500));

      let outcome;
      await act(async () => {
        outcome = await result.current.remove("2");
      });

      expect(outcome).toEqual({ ok: false, message: "Could not delete the document. Try again." });
      expect(result.current.state).toEqual({ status: "ready", documents: [two, one] });
    });

    it("reports a network problem and keeps the document in the list", async () => {
      const { result } = await ready();
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      let outcome;
      await act(async () => {
        outcome = await result.current.remove("2");
      });

      expect(outcome).toEqual({ ok: false, message: "Could not reach the server. Try again." });
      expect(result.current.state).toEqual({ status: "ready", documents: [two, one] });
    });
  });
});
