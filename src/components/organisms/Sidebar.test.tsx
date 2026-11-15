import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("shows the app name", () => {
    render(<Sidebar />);

    expect(screen.getByText("HR Assistant")).toBeInTheDocument();
  });

  it("shows the content it is given", () => {
    render(
      <Sidebar>
        <p>Document list</p>
      </Sidebar>,
    );

    expect(screen.getByText("Document list")).toBeInTheDocument();
  });

  it("reminds users that this is a demo and where their questions go", () => {
    render(<Sidebar />);

    expect(screen.getByText(/sample documents only/i)).toBeInTheDocument();
    expect(screen.getByText(/hosted AI model/i)).toBeInTheDocument();
  });
});
