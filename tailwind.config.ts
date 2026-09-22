import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:       "rgb(var(--bg) / <alpha-value>)",
        surface:  "rgb(var(--surface) / <alpha-value>)",
        surface2: "rgb(var(--surface2) / <alpha-value>)",
        surface3: "rgb(var(--surface3) / <alpha-value>)",
        border:   "rgb(var(--border) / <alpha-value>)",
        border2:  "rgb(var(--border2) / <alpha-value>)",
        text:     "rgb(var(--text) / <alpha-value>)",
        muted:    "rgb(var(--muted) / <alpha-value>)",
        subtle:   "rgb(var(--subtle) / <alpha-value>)",
        accent:   "rgb(var(--accent) / <alpha-value>)",
        "accent-d": "rgb(var(--accent-d) / <alpha-value>)",
        ok:       "rgb(var(--ok) / <alpha-value>)",
        "ok-d":   "rgb(var(--ok-d) / <alpha-value>)",
        danger:   "rgb(var(--danger) / <alpha-value>)",
        "danger-d": "rgb(var(--danger-d) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"',
          "Roboto", '"Helvetica Neue"', "Arial", "sans-serif",
        ],
        serif: ["ui-serif", "Georgia", '"Times New Roman"', "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      screens: { xs: "480px" },
    },
  },
  plugins: [],
};

export default config;
