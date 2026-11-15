import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropZone, SUCCESS_MESSAGE_MS } from "./DropZone";

const fetchMock = vi.fn();
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status });
const goodFile = () => new File(["hello"], "policy.md", { type: "text/markdown" });
const zone = () => screen.getByText("Add a document").closest("label") as HTMLLabelElement;
const picker = () => screen.getByLabelText("Add a document", { selector: "input" });

describe("DropZone", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("explains what to do and has a real, labelled file input for keyboard and screen reader users", () => {
    render(<DropZone />);

    expect(screen.getByText(/drop a .txt or .md file here/i)).toBeInTheDocument();
    expect(picker()).toHaveAttribute("type", "file");
    expect(picker()).toHaveAttribute("accept", ".txt,.md,text/plain,text/markdown");
  });

  it("uploads a picked file, confirms it and tells the parent", async () => {
    fetchMock.mockResolvedValue(json({ documentId: "1", chunkCount: 3 }, 201));
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<DropZone onUploaded={onUploaded} />);

    await user.upload(picker(), goodFile());

    expect(await screen.findByText("Added policy.md (3 parts).")).toBeInTheDocument();
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents");
  });

  it("uploads a dropped file", async () => {
    fetchMock.mockResolvedValue(json({ documentId: "1", chunkCount: 1 }, 201));
    const onUploaded = vi.fn();
    render(<DropZone onUploaded={onUploaded} />);

    fireEvent.drop(zone(), { dataTransfer: { files: [goodFile()] } });

    expect(await screen.findByText("Added policy.md (1 part).")).toBeInTheDocument();
    expect(onUploaded).toHaveBeenCalledTimes(1);
  });

  it("shows that it is ready to receive while a file is dragged over it, and calms down when it leaves", () => {
    render(<DropZone />);
    const area = zone(); // the text inside changes while dragging, so find the area first

    fireEvent.dragEnter(area);
    expect(screen.getByText("Release to add")).toBeInTheDocument();

    fireEvent.dragLeave(area);
    expect(screen.getByText("Add a document")).toBeInTheDocument();
  });

  it.each([
    { name: "photo.png", content: "x", message: "Only .txt and .md files are supported" },
    { name: "empty.md", content: "", message: "File is empty" },
    { name: "huge.md", content: "x".repeat(1_000_001), message: "File is too large (max 1 MB)" },
  ])("rejects $name before sending anything: $message", async ({ name, content, message }) => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    render(<DropZone onUploaded={onUploaded} />);

    // fireEvent.drop skips the browser's own "accept" filter, like dropping does.
    fireEvent.drop(zone(), { dataTransfer: { files: [new File([content], name)] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
    await user.click(document.body);
  });

  it("accepts one file at a time", async () => {
    render(<DropZone />);

    fireEvent.drop(zone(), { dataTransfer: { files: [goodFile(), goodFile()] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Add one file at a time.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's message, in sentence case, and does not tell the parent", async () => {
    fetchMock.mockResolvedValue(json({ error: "could not process the document" }, 500));
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<DropZone onUploaded={onUploaded} />);

    await user.upload(picker(), goodFile());

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not process the document");
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("shows progress and blocks a second upload while one is running", async () => {
    let finish: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<DropZone />);
    const area = zone();

    await user.upload(picker(), goodFile());

    expect(await screen.findByText("Reading your document…")).toBeInTheDocument();
    expect(picker()).toBeDisabled();
    fireEvent.drop(area, { dataTransfer: { files: [goodFile()] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish(json({ documentId: "1", chunkCount: 1 }, 201));
    expect(await screen.findByText(/Added policy\.md/)).toBeInTheDocument();
  });

  it("clears the old message when the user starts another upload", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "file is empty" }, 400)).mockResolvedValueOnce(json({ documentId: "2", chunkCount: 1 }, 201));
    const user = userEvent.setup();
    render(<DropZone />);

    await user.upload(picker(), goodFile());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.upload(picker(), goodFile());

    expect(await screen.findByText(/Added policy\.md/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("the confirmation message", () => {
    afterEach(() => vi.useRealTimers());

    async function uploadOk() {
      fetchMock.mockResolvedValue(json({ documentId: "1", chunkCount: 1 }, 201));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<DropZone />);
      await user.upload(picker(), goodFile());
      await screen.findByText(/Added policy\.md/);
    }

    it("disappears by itself, so it never goes stale", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await uploadOk();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SUCCESS_MESSAGE_MS + 100);
      });

      expect(screen.queryByText(/Added policy\.md/)).not.toBeInTheDocument();
    });

    it("is still there just before the time is up", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await uploadOk();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SUCCESS_MESSAGE_MS - 1000);
      });

      expect(screen.getByText(/Added policy\.md/)).toBeInTheDocument();
    });

    it("does not make an error message disappear", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      fetchMock.mockResolvedValue(json({ error: "file is empty" }, 400));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<DropZone />);
      await user.upload(picker(), goodFile());
      await screen.findByRole("alert");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SUCCESS_MESSAGE_MS * 3);
      });

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
