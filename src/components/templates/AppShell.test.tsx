import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell";
import { mockMatchMedia } from "@/test/mock-match-media";

function renderShell() {
  return render(
    <AppShell title="Ask your documents" sidebar={<p>Sidebar content</p>}>
      <p>Main content</p>
    </AppShell>,
  );
}

describe("AppShell", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("has a sidebar landmark and a main landmark", () => {
    renderShell();

    expect(screen.getByRole("complementary", { name: "Documents" })).toHaveTextContent("Sidebar content");
    expect(screen.getByRole("main")).toHaveTextContent("Main content");
  });

  it("shows the title", () => {
    renderShell();

    expect(screen.getByRole("heading", { level: 1, name: "Ask your documents" })).toBeInTheDocument();
  });

  it("offers a skip link that jumps to the main content", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("keeps the drawer closed until the menu button is pressed", () => {
    renderShell();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the sidebar as a drawer, and closes it with Escape", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open sidebar" }));

    const drawer = await screen.findByRole("dialog", { name: "Documents" });
    expect(within(drawer).getByText("Sidebar content")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
