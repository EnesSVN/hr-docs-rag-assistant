import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceList, sourceCardId } from "./SourceList";
import type { SearchResult } from "@/lib/search";

const source = (n: number, filename = `file-${n}.md`): SearchResult => ({
  chunkId: String(n),
  documentId: String(n),
  filename,
  chunkIndex: 0,
  content: `Passage text number ${n}.`,
  distance: 0.1 * n,
});
const five = [1, 2, 3, 4, 5].map((n) => source(n));

describe("SourceList", () => {
  it("shows nothing when there are no sources", () => {
    const { container } = render(<SourceList messageId="m1" sources={[]} answer="x" activeSource={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the cited sources first, marked as cited, with the number the answer uses", () => {
    render(<SourceList messageId="m1" sources={five} answer="Found it [3]." activeSource={null} />);

    const cards = within(screen.getByRole("region", { name: "Sources" })).getAllByRole("article");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAccessibleName("Source 3: file-3.md");
    expect(screen.getByText("Cited")).toBeInTheDocument();
  });

  it("keeps the other searched passages folded until asked", async () => {
    const user = userEvent.setup();
    render(<SourceList messageId="m1" sources={five} answer="Found it [3]." activeSource={null} />);
    expect(screen.queryByText("Passage text number 1.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Also searched (4)" }));

    expect(await screen.findByText("Passage text number 1.")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });

  it("orders several cited sources by number", () => {
    render(<SourceList messageId="m1" sources={five} answer="B [4], A [2]." activeSource={null} />);

    const names = screen.getAllByRole("article").map((card) => card.getAttribute("aria-label"));
    expect(names).toEqual(["Source 2: file-2.md", "Source 4: file-4.md"]);
  });

  it("when nothing is cited, lists all passages folded under a neutral title", async () => {
    const user = userEvent.setup();
    render(<SourceList messageId="m1" sources={five} answer="No citation here." activeSource={null} />);

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Passages searched (5)" }));

    expect(await screen.findAllByRole("article")).toHaveLength(5);
    expect(screen.queryByText("Cited")).not.toBeInTheDocument();
  });

  it("does not call a made-up number a citation", () => {
    render(<SourceList messageId="m1" sources={five} answer="Odd [9]." activeSource={null} />);

    expect(screen.queryByText("Cited")).not.toBeInTheDocument();
  });

  it("highlights the active source", () => {
    render(<SourceList messageId="m1" sources={five} answer="A [1] and B [2]." activeSource={2} />);

    expect(screen.getByRole("article", { name: "Source 2: file-2.md" })).toHaveClass("animate-source-flash");
    expect(screen.getByRole("article", { name: "Source 1: file-1.md" })).not.toHaveClass("animate-source-flash");
  });

  it("gives every card an id that is unique per message", () => {
    render(<SourceList messageId="m7" sources={five} answer="Found [2]." activeSource={null} />);

    expect(document.getElementById(sourceCardId("m7", 2))).not.toBeNull();
    expect(sourceCardId("m7", 2)).not.toBe(sourceCardId("m8", 2));
  });
});
