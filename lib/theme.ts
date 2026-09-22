export type Theme = "light" | "dark";
export const THEME_KEY = "tw-theme";

/**
 * Runs in <head> before first paint, so the page never flashes the wrong
 * theme. Uses the saved choice, else the operating system's setting.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;
