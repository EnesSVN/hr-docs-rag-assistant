// Runs in the "node" project on purpose: there is no window there, like on the server.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineScript } from "./InlineScript";

describe("InlineScript on the server", () => {
  it("renders an executable script with the given code", () => {
    const html = renderToString(createElement(InlineScript, { html: 'console.log("hi")' }));

    expect(html).toContain('type="text/javascript"');
    expect(html).toContain('console.log("hi")');
  });
});
