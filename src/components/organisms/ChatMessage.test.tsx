import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageData } from "@/lib/chat";

const sources = [1, 2, 3].map((n) => ({
  chunkId: String(n),
  documentId: String(n),
  filename: `file-${n}.md`,
  chunkIndex: 0,
  content: `Passage ${n}.`,
  distance: 0.1,
}));

const answered = (over: Partial<Extract<ChatMessageData, { status: "answered" }>> = {}): ChatMessageData => ({
  id: "m2",
  role: "assistant",
  question: "How many days?",
  status: "answered",
  answer: "You get 20 days [3].",
  refused: false,
  sources,
  ...over,
});

describe("ChatMessage", () => {
  it("shows the user's question, for screen readers as something the user said", () => {
    render(<ChatMessage message={{ id: "m1", role: "user", text: "How many days?" }} onRetry={() => {}} />);

    expect(screen.getByText("How many days?")).toBeInTheDocument();
    expect(screen.getByText(/You:/)).toHaveClass("sr-only");
  });

  it("shows that the answer is on its way", () => {
    render(<ChatMessage message={{ id: "m2", role: "assistant", question: "q", status: "pending" }} onRetry={() => {}} />);

    expect(screen.getByRole("status")).toHaveTextContent("Looking through your documents…");
  });

  it("shows an error with a way to try again", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatMessage
        message={{ id: "m2", role: "assistant", question: "q", status: "error", message: "The answer model is not available right now." }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("The answer model is not available right now.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledWith("m2");
  });

  it("explains a refusal in friendly words, in English, and shows no sources", () => {
    render(<ChatMessage message={answered({ refused: true, sources: [], answer: "I could not find the answer in the provided documents." })} onRetry={() => {}} />);

    expect(screen.getByText("I couldn't find that in your documents.")).toBeInTheDocument();
    expect(screen.getByText(/same language as the documents/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Sources" })).not.toBeInTheDocument();
  });

  it("shows the answer with citation badges and the cited source", () => {
    render(<ChatMessage message={answered()} onRetry={() => {}} />);

    expect(screen.getByRole("button", { name: "Show source 3" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Source 3: file-3.md" })).toBeInTheDocument();
  });

  describe("pressing a citation badge", () => {
    beforeEach(() => {
      Element.prototype.scrollIntoView = vi.fn();
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
      // @ts-expect-error: removing the test double again
      delete Element.prototype.scrollIntoView;
    });

    it("scrolls to the source and makes it flash", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ChatMessage message={answered()} onRetry={() => {}} />);

      await user.click(screen.getByRole("button", { name: "Show source 3" }));

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("article", { name: "Source 3: file-3.md" })).toHaveClass("animate-source-flash");
      expect(screen.getByRole("button", { name: "Show source 3" })).toHaveAttribute("aria-pressed", "true");
    });

    it("stops flashing after a moment", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ChatMessage message={answered()} onRetry={() => {}} />);
      await user.click(screen.getByRole("button", { name: "Show source 3" }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(screen.getByRole("article", { name: "Source 3: file-3.md" })).not.toHaveClass("animate-source-flash");
      expect(screen.getByRole("button", { name: "Show source 3" })).toHaveAttribute("aria-pressed", "false");
    });

    it("flashes again when the same badge is pressed again", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ChatMessage message={answered()} onRetry={() => {}} />);
      await user.click(screen.getByRole("button", { name: "Show source 3" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      await user.click(screen.getByRole("button", { name: "Show source 3" }));

      expect(screen.getByRole("article", { name: "Source 3: file-3.md" })).toHaveClass("animate-source-flash");
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
    });
  });
});
