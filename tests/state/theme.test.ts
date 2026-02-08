import { afterEach, describe, expect, it, vi } from "vitest";
import { applyThemeToDocument, getNextTheme, resolveInitialTheme } from "@/state/theme";

describe("theme state", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers stored dark or light values", () => {
    expect(resolveInitialTheme("dark")).toBe("dark");
    expect(resolveInitialTheme("light")).toBe("light");
  });

  it("falls back to dark without browser APIs", () => {
    expect(resolveInitialTheme(null)).toBe("dark");
  });

  it("toggles theme values deterministically", () => {
    expect(getNextTheme("dark")).toBe("light");
    expect(getNextTheme("light")).toBe("dark");
  });

  it("writes theme metadata on documentElement", () => {
    const documentElement = {
      dataset: {} as Record<string, string>,
      style: { colorScheme: "dark" }
    };

    vi.stubGlobal("document", { documentElement });

    applyThemeToDocument("light");

    expect(documentElement.dataset.theme).toBe("light");
    expect(documentElement.style.colorScheme).toBe("light");
  });
});
