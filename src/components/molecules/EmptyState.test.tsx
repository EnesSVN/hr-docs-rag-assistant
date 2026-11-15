import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("shows a heading and a description", () => {
    render(<EmptyState icon={<svg />} title="No documents yet" description="Add one to start." />);

    expect(screen.getByRole("heading", { level: 2, name: "No documents yet" })).toBeInTheDocument();
    expect(screen.getByText("Add one to start.")).toBeInTheDocument();
  });

  it("hides the decorative icon from screen readers", () => {
    render(<EmptyState icon={<svg data-testid="icon" />} title="Empty" description="Nothing here." />);

    expect(screen.getByTestId("icon").closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("shows actions or hints under the text when given", () => {
    render(
      <EmptyState icon={<svg />} title="Empty" description="Nothing here.">
        <button>Add a document</button>
      </EmptyState>,
    );

    expect(screen.getByRole("button", { name: "Add a document" })).toBeInTheDocument();
  });

  it("works without actions", () => {
    render(<EmptyState icon={<svg />} title="Empty" description="Nothing here." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
