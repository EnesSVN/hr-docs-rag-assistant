// Runs in the "node" project on purpose: there is no window there, like on the server.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useHydrated } from "./useHydrated";

function Probe() {
  return createElement("p", null, String(useHydrated()));
}

describe("useHydrated on the server", () => {
  it("is false, so the server never claims something only the browser can know", () => {
    expect(renderToString(createElement(Probe))).toContain("false");
  });
});
