// Runs in the "node" project on purpose: there is no window there, like on the server.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle on the server", () => {
  it("is drawn invisible, because the server cannot know the saved choice (it would show the wrong one)", () => {
    const html = renderToString(createElement(ThemeToggle));

    expect(html).toContain("opacity-0");
    expect(html).not.toContain("opacity-100");
  });
});
