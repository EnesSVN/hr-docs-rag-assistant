import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusMessage } from "./StatusMessage";

describe("StatusMessage", () => {
  it("shows the title and the message", () => {
    render(
      <StatusMessage variant="warning" title="Heads up">
        Be careful.
      </StatusMessage>,
    );

    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Be careful.")).toBeInTheDocument();
  });

  it("works without a title", () => {
    render(<StatusMessage>Just a message</StatusMessage>);
    expect(screen.getByText("Just a message")).toBeInTheDocument();
  });

  it("uses role=alert for errors, so screen readers announce them at once", () => {
    render(<StatusMessage variant="error">Failed</StatusMessage>);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });

  it.each(["info", "success", "warning"] as const)("uses role=status for %s (polite announcement)", (variant) => {
    render(<StatusMessage variant={variant}>Done</StatusMessage>);
    expect(screen.getByRole("status")).toHaveTextContent("Done");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hides the decorative icon from screen readers", () => {
    const { container } = render(<StatusMessage variant="success">Saved</StatusMessage>);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("applies the color tokens of its variant and keeps extra classes", () => {
    render(
      <StatusMessage variant="success" className="mt-4">
        Saved
      </StatusMessage>,
    );
    const box = screen.getByRole("status");
    expect(box).toHaveClass("text-success", "mt-4");
  });
});
