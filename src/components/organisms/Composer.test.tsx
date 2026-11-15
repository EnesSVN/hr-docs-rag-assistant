import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "./Composer";

const box = () => screen.getByRole("textbox", { name: "Your question" });
const sendButton = () => screen.getByRole("button", { name: "Send" });

describe("Composer", () => {
  it("cannot send an empty question", () => {
    render(<Composer onSend={() => {}} />);

    expect(sendButton()).toBeDisabled();
  });

  it("cannot send a question made of spaces only", async () => {
    const user = userEvent.setup();
    render(<Composer onSend={() => {}} />);

    await user.type(box(), "   ");

    expect(sendButton()).toBeDisabled();
  });

  it("sends the trimmed question with the button, and empties the box", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={onSend} />);

    await user.type(box(), "  How many days?  ");
    await user.click(sendButton());

    expect(onSend).toHaveBeenCalledWith("How many days?");
    expect(box()).toHaveValue("");
  });

  it("sends with Enter", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={onSend} />);

    await user.type(box(), "Question{Enter}");

    expect(onSend).toHaveBeenCalledWith("Question");
    expect(box()).toHaveValue("");
  });

  it("starts a new line with Shift+Enter instead of sending", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={onSend} />);

    await user.type(box(), "Line one{Shift>}{Enter}{/Shift}Line two");

    expect(onSend).not.toHaveBeenCalled();
    expect(box()).toHaveValue("Line one\nLine two");
  });

  it("does not send while the user is still composing characters (IME)", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    fireEvent.change(box(), { target: { value: "こんにちは" } });

    fireEvent.keyDown(box(), { key: "Enter", isComposing: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("cannot send while an answer is on its way", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={onSend} pending />);

    await user.type(box(), "Another question{Enter}");

    expect(onSend).not.toHaveBeenCalled();
    expect(sendButton()).toBeDisabled();
    expect(sendButton()).toHaveAttribute("aria-busy", "true");
  });

  it("is locked, and says why, when there is a reason", () => {
    render(<Composer onSend={() => {}} disabledReason="Add a document first" />);

    expect(box()).toBeDisabled();
    expect(box()).toHaveAttribute("placeholder", "Add a document first");
    expect(sendButton()).toBeDisabled();
  });

  it("limits the length and shows a counter when it gets close", async () => {
    const user = userEvent.setup();
    render(<Composer onSend={() => {}} maxLength={20} />);
    expect(box()).toHaveAttribute("maxlength", "20");
    expect(screen.queryByText(/\/20/)).not.toBeInTheDocument();

    await user.type(box(), "x".repeat(17));

    expect(screen.getByText("17/20")).toBeInTheDocument();
  });

  it("explains the keyboard shortcuts", () => {
    render(<Composer onSend={() => {}} />);

    expect(screen.getByText(/Enter to send, Shift\+Enter for a new line/)).toBeInTheDocument();
  });
});
