import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  // Next's tsconfig leaves JSX untouched ("preserve"); the tests need it compiled.
  esbuild: { jsx: "automatic" },
  test: {
    // Logic tests run in node; component tests opt into a browser DOM with
    // a "@vitest-environment jsdom" comment at the top of the file.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // API keys from .env.local, so live tests call sources the way the app does.
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
