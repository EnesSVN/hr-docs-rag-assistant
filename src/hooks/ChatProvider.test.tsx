import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatProvider, useChatContext } from "./ChatProvider";

const fetchMock = vi.fn();

function Asker() {
  const { send } = useChatContext();
  return <button onClick={() => void send("Question")}>ask</button>;
}

function Counter() {
  const { messages } = useChatContext();
  return <p>{`messages: ${messages.length}`}</p>;
}

describe("ChatProvider", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lets parts that are far apart in the page see the same conversation", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ answer: "a", refused: false, sources: [] }), { status: 200 }));
    const user = userEvent.setup();
    render(
      <ChatProvider>
        <Asker />
        <Counter />
        <Counter />
      </ChatProvider>,
    );

    await user.click(screen.getByRole("button", { name: "ask" }));

    expect(await screen.findAllByText("messages: 2")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives a clear error when used outside the provider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useChatContext())).toThrow("inside <ChatProvider>");
    quiet.mockRestore();
  });
});
