import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";

function renderField(props: { description?: string; error?: string } = {}) {
  return render(
    <FormField label="Your name" {...props}>
      {(control) => <input {...control} />}
    </FormField>,
  );
}

describe("FormField", () => {
  it("links the label to the control", () => {
    renderField();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
  });

  it("links the hint to the control for screen readers", () => {
    renderField({ description: "As on your passport" });

    const input = screen.getByLabelText("Your name");
    expect(input).toHaveAccessibleDescription("As on your passport");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and links the error message", () => {
    renderField({ error: "Name is required" });

    const input = screen.getByLabelText("Your name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Name is required");
  });

  it("links both hint and error when both are shown", () => {
    renderField({ description: "As on your passport", error: "Name is required" });

    expect(screen.getByLabelText("Your name")).toHaveAccessibleDescription("As on your passport Name is required");
  });

  it("gives every field its own id", () => {
    render(
      <>
        <FormField label="First">{(c) => <input {...c} />}</FormField>
        <FormField label="Second">{(c) => <input {...c} />}</FormField>
      </>,
    );

    expect(screen.getByLabelText("First").id).not.toBe(screen.getByLabelText("Second").id);
  });
});
