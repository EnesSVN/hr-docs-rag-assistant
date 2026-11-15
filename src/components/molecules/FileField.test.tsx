import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileField } from "./FileField";

describe("FileField", () => {
  it("gives the chosen file to onFileChange", async () => {
    const onFileChange = vi.fn();
    const user = userEvent.setup();
    render(<FileField label="Document" onFileChange={onFileChange} />);
    const file = new File(["hi"], "notes.md");

    await user.upload(screen.getByLabelText("Document"), file);

    expect(onFileChange).toHaveBeenCalledWith(file);
  });

  it("gives null when the choice is cleared", async () => {
    const onFileChange = vi.fn();
    const user = userEvent.setup();
    render(<FileField label="Document" onFileChange={onFileChange} />);
    const input = screen.getByLabelText("Document");

    await user.upload(input, new File(["hi"], "notes.md"));
    await user.upload(input, []);

    expect(onFileChange).toHaveBeenLastCalledWith(null);
  });

  it("is a real file input with the given accept filter", () => {
    render(<FileField label="Document" accept=".txt,.md" onFileChange={() => {}} />);

    const input = screen.getByLabelText("Document");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ".txt,.md");
  });

  it("shows the hint and the error", () => {
    render(<FileField label="Document" description="Max 1 MB" error="Too big" onFileChange={() => {}} />);

    expect(screen.getByLabelText("Document")).toHaveAccessibleDescription("Max 1 MB Too big");
  });

  it("can be disabled", () => {
    render(<FileField label="Document" disabled onFileChange={() => {}} />);
    expect(screen.getByLabelText("Document")).toBeDisabled();
  });
});
