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
        brand: {
          50:  "#f0fff4",
          100: "#dcffe4",
          200: "#b7f5c0",
          300: "#6fee8d",
          400: "#3fb950",
          500: "#2ea043",
          600: "#238636",
          700: "#196c2e",
          800: "#0f5323",
          900: "#033a16",
          950: "#010d05",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', '"Noto Sans"',
          "Helvetica", "Arial", "sans-serif",
        ],
        mono: [
          "ui-monospace", "SFMono-Regular", '"SF Mono"', "Menlo",
          "Consolas", '"Liberation Mono"', "monospace",
        ],
      },
      screens: { xs: "480px" },
    },
  },
  plugins: [],
};

export default config;
