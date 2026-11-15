import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadForm } from "./UploadForm";

// A fake fetch, so no real server is needed.
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status });
}

const textFile = () => new File(["hello"], "policy.md", { type: "text/markdown" });

describe("UploadForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the upload button disabled until a file is chosen", async () => {
    const user = userEvent.setup();
    render(<UploadForm />);

    const button = screen.getByRole("button", { name: "Upload" });
    expect(button).toBeDisabled();

    await user.upload(screen.getByLabelText(/document/i), textFile());
    expect(button).toBeEnabled();
  });

  it("sends the file to /api/documents and shows the success message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ documentId: "1", chunkCount: 3 }, 201));
    const user = userEvent.setup();
    render(<UploadForm />);

    await user.upload(screen.getByLabelText(/document/i), textFile());
    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(await screen.findByText(/Uploaded policy\.md: stored as 3 parts/)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/documents");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });

  // Regression test: a bug in our own code once showed this success as
  // "could not reach the server" (event.currentTarget was null after await).
  it("does not show an error after a successful upload, and clears the file", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ documentId: "1", chunkCount: 1 }, 201));
    const user = userEvent.setup();
    render(<UploadForm />);

    // jsdom does not clear a file input on reset(), so we check that reset() was called.
    const resetSpy = vi.spyOn(HTMLFormElement.prototype, "reset");
    await user.upload(screen.getByLabelText(/document/i), textFile());
    await user.click(screen.getByRole("button", { name: "Upload" }));

    await screen.findByText(/stored as 1 part\b/);
    expect(screen.queryByText(/could not reach/i)).not.toBeInTheDocument();
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
    resetSpy.mockRestore();
  });

  it("shows the server's error message and lets the user try again", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "only .txt and .md files are supported" }, 415));
    const user = userEvent.setup();
    render(<UploadForm />);

    await user.upload(screen.getByLabelText(/document/i), textFile());
    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(await screen.findByText("only .txt and .md files are supported")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeEnabled();
  });

  it("shows a connection message when the request itself fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    render(<UploadForm />);

    await user.upload(screen.getByLabelText(/document/i), textFile());
    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
  });

  it("disables the button and shows progress while uploading", async () => {
    let finish: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<UploadForm />);

    await user.upload(screen.getByLabelText(/document/i), textFile());
    await user.click(screen.getByRole("button", { name: "Upload" }));

    // The request has not finished yet: the button shows progress and cannot be clicked again.
    expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled();

    finish(jsonResponse({ documentId: "1", chunkCount: 1 }, 201));
    await waitFor(() => expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument());
  });
});
