import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnswerText } from "./AnswerText";

describe("AnswerText", () => {
  it("shows plain text as it is", () => {
    render(<AnswerText text="No sources here." sourceCount={3} />);

    expect(screen.getByText("No sources here.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("turns a citation into a badge and keeps the text around it", () => {
    render(<AnswerText text="You get 20 days [3] per year." sourceCount={5} />);

    expect(screen.getByRole("button", { name: "Show source 3" })).toBeInTheDocument();
    expect(screen.getByText(/You get 20 days/)).toHaveTextContent("You get 20 days 3 per year.");
  });

  it("makes one badge for each number of a list", () => {
    render(<AnswerText text="Both say so [1, 2]." sourceCount={3} />);

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["1", "2"]);
  });

  it("reports which badge was pressed", async () => {
    const onCitationClick = vi.fn();
    const user = userEvent.setup();
    render(<AnswerText text="A [1] and B [2]." sourceCount={2} onCitationClick={onCitationClick} />);

    await user.click(screen.getByRole("button", { name: "Show source 2" }));

    expect(onCitationClick).toHaveBeenCalledWith(2);
  });

  it("marks the badge of the open source", () => {
    render(<AnswerText text="A [1] and B [2]." sourceCount={2} activeSource={2} />);

    expect(screen.getByRole("button", { name: "Show source 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Show source 1" })).toHaveAttribute("aria-pressed", "false");
  });

  it("does not make a badge for a source that does not exist", () => {
    render(<AnswerText text="Made up [9]." sourceCount={3} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Made up [9].")).toBeInTheDocument();
  });

  it("removes the space models leave between a citation and the full stop", () => {
    render(<AnswerText text="20 days [3] ." sourceCount={5} />);

    expect(screen.getByText(/20 days/)).toHaveTextContent("20 days 3.");
  });

  it("keeps line breaks of the answer", () => {
    render(<AnswerText text={"Line one\nLine two"} sourceCount={1} />);

    expect(screen.getByText(/Line one/)).toHaveClass("whitespace-pre-wrap");
  });
});
