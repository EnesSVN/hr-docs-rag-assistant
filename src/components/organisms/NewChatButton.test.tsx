import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewChatButton } from "./NewChatButton";
import { ChatProvider, useChatContext } from "@/hooks/ChatProvider";

const fetchMock = vi.fn();
const answer = () => new Response(JSON.stringify({ answer: "a", refused: false, sources: [] }), { status: 200 });

function Asker() {
  const { send, messages } = useChatContext();
  return (
    <>
      <button onClick={() => void send("Question")}>ask</button>
      <p>{`messages: ${messages.length}`}</p>
    </>
  );
}

function setup() {
  return render(
    <ChatProvider>
      <NewChatButton />
      <Asker />
    </ChatProvider>,
  );
}

describe("NewChatButton", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("has nothing to do before the first question", () => {
    setup();

    expect(screen.getByRole("button", { name: "New chat" })).toBeDisabled();
  });

  it("clears the conversation after a question", async () => {
    fetchMock.mockResolvedValue(answer());
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "ask" }));
    await screen.findByText("messages: 2");

    await user.click(screen.getByRole("button", { name: "New chat" }));

    expect(screen.getByText("messages: 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New chat" })).toBeDisabled();
  });

  it("waits while an answer is on its way", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "ask" }));

    expect(await screen.findByText("messages: 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New chat" })).toBeDisabled();
  });

  it("keeps its name for screen readers (the visible text is hidden on small screens)", () => {
    setup();

    expect(screen.getByRole("button", { name: "New chat" })).toHaveAttribute("aria-label", "New chat");
  });
});
