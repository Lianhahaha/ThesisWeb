export type Theme = "light" | "dark";
export const THEME_KEY = "tw-theme";

/**
 * Runs in <head> before first paint, so the page never flashes the wrong
 * theme. Uses the saved choice, else the operating system's setting.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export type ThemeChoice = Theme | "system";

/** Saved choice, or "system" when none (or storage is blocked). */
export function savedThemeChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** Apply and remember a theme. Returns the theme now showing. */
export function applyTheme(choice: ThemeChoice): Theme {
  const resolved: Theme =
    choice === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : choice;
  document.documentElement.dataset.theme = resolved;
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage blocked: applies for this visit only.
  }
  return resolved;
}
