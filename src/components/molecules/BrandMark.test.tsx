import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandMark } from "./BrandMark";

describe("BrandMark", () => {
  it("shows the app name", () => {
    render(<BrandMark />);

    expect(screen.getByText("HR Assistant")).toBeInTheDocument();
  });

  it("hides the logo tile from screen readers (the name already says it)", () => {
    const { container } = render(<BrandMark />);

    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("accepts extra classes for placement", () => {
    const { container } = render(<BrandMark className="mt-4" />);

    expect(container.firstElementChild).toHaveClass("mt-4");
  });
});
