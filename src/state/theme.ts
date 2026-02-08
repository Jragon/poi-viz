export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "poi-phase-visualiser-theme";

const DARK_THEME: Theme = "dark";
const LIGHT_THEME: Theme = "light";

function isTheme(value: string | null): value is Theme {
  return value === DARK_THEME || value === LIGHT_THEME;
}

function getSystemPreferredTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return DARK_THEME;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? LIGHT_THEME : DARK_THEME;
}

/**
 * Resolves the initial app theme from persisted storage, then system preference.
 *
 * @param storedTheme Raw stored theme value from browser storage.
 * @returns Resolved app theme.
 */
export function resolveInitialTheme(storedTheme: string | null): Theme {
  if (isTheme(storedTheme)) {
    return storedTheme;
  }
  return getSystemPreferredTheme();
}

/**
 * Applies theme metadata to the document root so CSS and native form controls match.
 *
 * @param theme Theme to apply to the document root.
 * @returns Nothing.
 */
export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/**
 * Returns the next theme in a two-theme toggle cycle.
 *
 * @param theme Current app theme.
 * @returns Opposite theme.
 */
export function getNextTheme(theme: Theme): Theme {
  return theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
}
