import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";
import { mockMatchMedia } from "@/test/mock-match-media";

const isDark = () => document.documentElement.classList.contains("dark");

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("starts on System when nothing was saved", () => {
    mockMatchMedia(false);
    render(<ThemeToggle />);

    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  });

  it("switches to dark, adds the dark class and remembers the choice", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(isDark()).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  });

  it("switches back to light and removes the dark class", async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    await user.click(screen.getByRole("radio", { name: "Light" }));

    expect(isDark()).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("in System mode, follows the operating system when it changes", async () => {
    const system = mockMatchMedia(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("radio", { name: "System" }));
    expect(isDark()).toBe(false);

    act(() => system.setSystemDark(true));
    expect(isDark()).toBe(true);

    act(() => system.setSystemDark(false));
    expect(isDark()).toBe(false);
  });

  it("in a fixed mode, ignores the operating system", async () => {
    const system = mockMatchMedia(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("radio", { name: "Light" }));

    act(() => system.setSystemDark(true));

    expect(isDark()).toBe(false);
  });

  it("restores a saved choice", () => {
    mockMatchMedia(false);
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  });

  it("falls back to System when the saved value is not a known mode", () => {
    mockMatchMedia(false);
    localStorage.setItem("theme", "purple");
    render(<ThemeToggle />);

    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  });

  it("stops listening to the system when it is removed from the page", () => {
    const system = mockMatchMedia(false);
    const { unmount } = render(<ThemeToggle />);
    expect(system.listenerCount()).toBeGreaterThan(0);

    unmount();

    expect(system.listenerCount()).toBe(0);
  });

  it("is visible once the browser has read the saved choice", () => {
    mockMatchMedia(false);
    const { container } = render(<ThemeToggle />);

    expect(container.firstElementChild).toHaveClass("opacity-100");
    expect(container.firstElementChild).not.toHaveClass("opacity-0");
  });
});
