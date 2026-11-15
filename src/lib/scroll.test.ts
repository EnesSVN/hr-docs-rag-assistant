// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollToElement } from "./scroll";

function elementWithScroll() {
  const element = document.createElement("div");
  element.scrollIntoView = vi.fn();
  return element;
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("prefers-reduced-motion") }));
}

describe("scrollToElement", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("scrolls smoothly by default", () => {
    setReducedMotion(false);
    const element = elementWithScroll();

    scrollToElement(element);

    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
  });

  it("jumps instead of gliding when the user wants less motion", () => {
    setReducedMotion(true);
    const element = elementWithScroll();

    scrollToElement(element, "end");

    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "end" });
  });

  it("does not fail without an element or without scroll support", () => {
    expect(() => scrollToElement(null)).not.toThrow();
    expect(() => scrollToElement(undefined)).not.toThrow();
    expect(() => scrollToElement(document.createElement("div"))).not.toThrow();
  });

  it("does not fail where matchMedia does not exist", () => {
    vi.stubGlobal("matchMedia", undefined);
    const element = elementWithScroll();

    scrollToElement(element);

    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
  });
});
