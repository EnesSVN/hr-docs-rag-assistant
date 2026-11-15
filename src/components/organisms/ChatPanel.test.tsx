import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel, STARTER_QUESTIONS } from "./ChatPanel";
import { DocumentsProvider } from "@/hooks/DocumentsProvider";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const doc = { id: "1", filename: "leave.md", chunkCount: 2, createdAt: "2026-11-15T10:00:00.000Z" };
const source = { chunkId: "1", documentId: "1", filename: "leave.md", chunkIndex: 0, content: "Annual leave is 20 days.", distance: 0.1 };

// Answers /api/documents with the given list and /api/ask with whatever `ask` returns.
function setup(documents: unknown[], ask: () => Promise<Response> = async () => json({ answer: "20 days [1]", refused: false, sources: [source] })) {
  fetchMock.mockImplementation(async (url: string) => (url === "/api/documents" ? json({ documents }) : ask()));
  return render(
    <DocumentsProvider>
      <ChatPanel />
    </DocumentsProvider>,
  );
}

const box = () => screen.getByRole("textbox", { name: "Your question" });

describe("ChatPanel", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("before the first question", () => {
    it("asks the user to add a document when there are none, and locks the question box", async () => {
      setup([]);

      expect(await screen.findByRole("heading", { name: "Add a document to begin" })).toBeInTheDocument();
      expect(box()).toBeDisabled();
      expect(box()).toHaveAttribute("placeholder", "Add a document first");
      expect(screen.queryByRole("list", { name: "Example questions" })).not.toBeInTheDocument();
    });

    it("invites a question and offers examples when documents exist", async () => {
      setup([doc]);

      expect(await screen.findByRole("list", { name: "Example questions" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Ask your documents" })).toBeInTheDocument();
      expect(screen.getByText(/same language as your documents/i)).toBeInTheDocument();
      expect(box()).toBeEnabled();
    });

    it("does not offer examples before it knows whether documents exist", () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      render(
        <DocumentsProvider>
          <ChatPanel />
        </DocumentsProvider>,
      );

      expect(screen.queryByRole("list", { name: "Example questions" })).not.toBeInTheDocument();
      expect(box()).toBeEnabled();
    });

    it("asks an example question when it is pressed", async () => {
      const user = userEvent.setup();
      setup([doc]);

      await user.click(await screen.findByRole("button", { name: STARTER_QUESTIONS[0] }));

      expect(await screen.findByText("20 days")).toBeInTheDocument();
      expect(screen.getByText(STARTER_QUESTIONS[0])).toBeInTheDocument();
      expect(JSON.parse(fetchMock.mock.calls.find((c) => c[0] === "/api/ask")![1].body)).toEqual({ question: STARTER_QUESTIONS[0] });
    });
  });

  describe("asking", () => {
    it("shows the question, waits with an indicator, then shows the answer and its source", async () => {
      let finish: (response: Response) => void = () => {};
      const user = userEvent.setup();
      setup([doc], () => new Promise<Response>((resolve) => (finish = resolve)));
      await screen.findByRole("list", { name: "Example questions" });

      await user.type(box(), "How many days?{Enter}");

      expect(screen.getByText("How many days?")).toBeInTheDocument();
      expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Looking through your documents…");
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

      finish(json({ answer: "You get 20 days [1].", refused: false, sources: [source] }));

      expect(await screen.findByRole("button", { name: "Show source 1" })).toBeInTheDocument();
      expect(screen.getByRole("article", { name: "Source 1: leave.md" })).toBeInTheDocument();
      expect(screen.queryByText("Looking through your documents…")).not.toBeInTheDocument();
      expect(box()).toHaveValue("");
    });

    it("shows a friendly message when nothing was found", async () => {
      const user = userEvent.setup();
      setup([doc], async () => json({ answer: "I could not find the answer in the provided documents.", refused: true, sources: [] }));
      await screen.findByRole("list", { name: "Example questions" });

      await user.type(box(), "Something else{Enter}");

      expect(await screen.findByText("I couldn't find that in your documents.")).toBeInTheDocument();
    });

    it("keeps the earlier questions and answers", async () => {
      const user = userEvent.setup();
      setup([doc]);
      await screen.findByRole("list", { name: "Example questions" });

      await user.type(box(), "First{Enter}");
      await screen.findByText("20 days");
      await user.type(box(), "Second{Enter}");

      await waitFor(() => expect(screen.getAllByRole("article", { name: "Answer" })).toHaveLength(2));
      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
    });
  });

  describe("when something goes wrong", () => {
    it("shows the problem and asks again after 'Try again'", async () => {
      const user = userEvent.setup();
      let calls = 0;
      setup([doc], async () => (++calls === 1 ? json({ error: "x" }, 502) : json({ answer: "20 days [1]", refused: false, sources: [source] })));
      await screen.findByRole("list", { name: "Example questions" });

      await user.type(box(), "How many days?{Enter}");
      expect(await screen.findByRole("alert")).toHaveTextContent("The answer model is not available right now. Try again in a moment.");
      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByRole("button", { name: "Show source 1" })).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getAllByText("How many days?")).toHaveLength(1);
    });
  });

  describe("New chat", () => {
    it("is not shown before the first question", async () => {
      setup([doc]);
      await screen.findByRole("list", { name: "Example questions" });

      expect(screen.queryByRole("button", { name: "New chat" })).not.toBeInTheDocument();
    });

    it("clears the conversation and brings back the examples", async () => {
      const user = userEvent.setup();
      setup([doc]);
      await screen.findByRole("list", { name: "Example questions" });
      await user.type(box(), "Question{Enter}");
      await screen.findByText("20 days");

      await user.click(screen.getByRole("button", { name: "New chat" }));

      expect(screen.queryByRole("article", { name: "Answer" })).not.toBeInTheDocument();
      expect(screen.getByRole("list", { name: "Example questions" })).toBeInTheDocument();
    });

    it("cannot be used while an answer is on its way", async () => {
      const user = userEvent.setup();
      setup([doc], () => new Promise<Response>(() => {}));
      await screen.findByRole("list", { name: "Example questions" });

      await user.type(box(), "Question{Enter}");

      expect(await screen.findByRole("button", { name: "New chat" })).toBeDisabled();
    });
  });

  it("has a conversation area that screen readers follow", async () => {
    setup([doc]);

    expect(await screen.findByRole("log", { name: "Conversation" })).toHaveAttribute("aria-live", "polite");
  });
});
