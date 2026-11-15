import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { InlineScript } from "./InlineScript";

describe("InlineScript in the browser", () => {
  it("renders an inert script, so React does not warn and nothing runs twice", () => {
    const { container } = render(<InlineScript html="window.__ran = true" />);

    expect(container.querySelector("script")).toHaveAttribute("type", "text/plain");
    expect((window as unknown as { __ran?: boolean }).__ran).toBeUndefined();
  });
});
