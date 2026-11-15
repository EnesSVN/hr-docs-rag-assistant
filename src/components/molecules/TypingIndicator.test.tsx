import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TypingIndicator } from "./TypingIndicator";

describe("TypingIndicator", () => {
  it("tells screen readers what is happening", () => {
    render(<TypingIndicator />);

    expect(screen.getByRole("status")).toHaveTextContent("Looking through your documents…");
  });

  it("accepts another text", () => {
    render(<TypingIndicator label="Thinking…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Thinking…");
  });

  it("hides the three dots from screen readers", () => {
    const { container } = render(<TypingIndicator />);

    expect(container.querySelector("[aria-hidden='true']")?.children).toHaveLength(3);
  });
});
