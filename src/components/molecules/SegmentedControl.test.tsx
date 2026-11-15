import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "./SegmentedControl";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;

describe("SegmentedControl", () => {
  it("shows every option and marks the selected one", () => {
    render(<SegmentedControl aria-label="Letters" value="b" onValueChange={() => {}} options={options} />);

    expect(screen.getByRole("radiogroup", { name: "Letters" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Beta" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Alpha" })).not.toBeChecked();
  });

  it("reports the option the user picks", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<SegmentedControl aria-label="Letters" value="a" onValueChange={onValueChange} options={options} />);

    await user.click(screen.getByRole("radio", { name: "Gamma" }));

    expect(onValueChange).toHaveBeenCalledWith("c");
  });

  it("keeps the selection when the selected option is clicked again", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<SegmentedControl aria-label="Letters" value="a" onValueChange={onValueChange} options={options} />);

    await user.click(screen.getByRole("radio", { name: "Alpha" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("can be used with the keyboard", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<SegmentedControl aria-label="Letters" value="a" onValueChange={onValueChange} options={options} />);

    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("in icon-only mode hides the text but keeps the accessible name", () => {
    render(
      <SegmentedControl
        aria-label="Letters"
        iconOnly
        value="a"
        onValueChange={() => {}}
        options={options.map((o) => ({ ...o, icon: <svg data-testid={`icon-${o.value}`} /> }))}
      />,
    );

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByTestId("icon-a")).toBeInTheDocument();
  });
});
