import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarterPrompts } from "./StarterPrompts";

const prompts = ["First question", "Second question"] as const;

describe("StarterPrompts", () => {
  it("lists every example", () => {
    render(<StarterPrompts prompts={prompts} onPick={() => {}} />);

    expect(screen.getByRole("list", { name: "Example questions" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([...prompts]);
  });

  it("gives the chosen question to onPick", async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<StarterPrompts prompts={prompts} onPick={onPick} />);

    await user.click(screen.getByRole("button", { name: "Second question" }));

    expect(onPick).toHaveBeenCalledWith("Second question");
  });

  it("cannot be used when disabled", async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<StarterPrompts prompts={prompts} onPick={onPick} disabled />);

    await user.click(screen.getByRole("button", { name: "First question" }));

    expect(onPick).not.toHaveBeenCalled();
  });
});
