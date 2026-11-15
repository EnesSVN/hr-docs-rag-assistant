// Scrolls an element into view. Smooth scrolling is skipped for people who asked their
// system for less motion. Does nothing where scrolling is not available (like in tests).
export function scrollToElement(element: Element | null | undefined, block: ScrollLogicalPosition = "nearest") {
  if (!element || typeof element.scrollIntoView !== "function") return;
  const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block });
}
