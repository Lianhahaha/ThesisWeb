import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  // API keys come from .env.local so live tests call sources the way the app
  // does. Redis is deliberately removed: unit tests must stay offline, and the
  // rate-limit tests stub the Redis variables themselves.
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
    delete env[key];
  }

  return {
    resolve: {
      alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
    },
    // Next's tsconfig leaves JSX untouched ("preserve"); the tests need it compiled.
    esbuild: { jsx: "automatic" },
    test: {
      // Logic tests run in node; component tests opt into a browser DOM with
      // a "@vitest-environment jsdom" comment at the top of the file.
      environment: "node",
      setupFiles: ["tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      env,
    },
  };
});
