import { applyThemeToDocument, getNextTheme, resolveInitialTheme, THEME_STORAGE_KEY, type Theme } from "@/state/theme";
import { computed, ref, type ComputedRef, type Ref } from "vue";

/**
 * View-theme controller contract used by root orchestration.
 */
export interface ThemeController {
  theme: Ref<Theme>;
  themeButtonLabel: ComputedRef<string>;
  initializeTheme: () => void;
  handleToggleTheme: () => void;
}

function getStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore write failures (private mode, quota, disabled storage).
  }
}

/**
 * Provides theme state + handlers with persistent storage integration.
 */
export function useThemeController(): ThemeController {
  const theme = ref<Theme>("dark");
  const themeButtonLabel = computed(() => (theme.value === "dark" ? "Light Theme" : "Dark Theme"));

  return {
    theme,
    themeButtonLabel,
    initializeTheme(): void {
      theme.value = resolveInitialTheme(getStorageValue(THEME_STORAGE_KEY));
      applyThemeToDocument(theme.value);
    },
    handleToggleTheme(): void {
      const nextTheme = getNextTheme(theme.value);
      theme.value = nextTheme;
      applyThemeToDocument(nextTheme);
      setStorageValue(THEME_STORAGE_KEY, nextTheme);
    }
  };
}
