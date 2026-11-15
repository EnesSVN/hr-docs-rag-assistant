// Named .test.tsx so it runs in the jsdom ("dom") project, which renderHook needs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUpload } from "./useUpload";

const fetchMock = vi.fn();
const file = new File(["hello"], "policy.md");
const jsonResponse = (body: unknown, status: number) => new Response(JSON.stringify(body), { status });

describe("useUpload", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts idle", () => {
    const { result } = renderHook(() => useUpload());
    expect(result.current.state).toEqual({ kind: "idle" });
  });

  it("posts the file as form data and reports success", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ documentId: "1", chunkCount: 4 }, 201));
    const { result } = renderHook(() => useUpload());

    let stored = false;
    await act(async () => {
      stored = await result.current.upload(file);
    });

    expect(stored).toBe(true);
    expect(result.current.state).toEqual({ kind: "success", filename: "policy.md", chunkCount: 4 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/documents");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBe(file);
  });

  it("is in the uploading state until the request finishes", async () => {
    let finish: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useUpload());

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.upload(file);
    });
    expect(result.current.state).toEqual({ kind: "uploading" });

    await act(async () => {
      finish(jsonResponse({ documentId: "1", chunkCount: 1 }, 201));
      await pending;
    });
    expect(result.current.state.kind).toBe("success");
  });

  it("uses the server's error message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "file is empty" }, 400));
    const { result } = renderHook(() => useUpload());

    let stored = true;
    await act(async () => {
      stored = await result.current.upload(file);
    });

    expect(stored).toBe(false);
    expect(result.current.state).toEqual({ kind: "error", message: "file is empty" });
  });

  it("falls back to the HTTP status when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>oops</html>", { status: 502 }));
    const { result } = renderHook(() => useUpload());

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.state).toEqual({ kind: "error", message: "Upload failed (HTTP 502)" });
  });

  it("reports a connection problem when the request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useUpload());

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.state).toEqual({
      kind: "error",
      message: "Could not reach the server. Check your connection and try again.",
    });
  });

  it("goes back to idle on reset", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useUpload());
    await act(async () => {
      await result.current.upload(file);
    });

    act(() => result.current.reset());

    expect(result.current.state).toEqual({ kind: "idle" });
  });
});
