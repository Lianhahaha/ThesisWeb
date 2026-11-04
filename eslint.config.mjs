import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...(nextVitals.default || nextVitals),
  {
    // .kilo holds another tool's git worktree, .mimocode its local state.
    ignores: ['.next/**', 'out/**', 'build/**', 'node_modules/**', '.kilo/**', '.mimocode/**'],
  },
  {
    // The service worker runs in its own global scope, not the browser window.
    files: ['public/sw.js'],
    languageOptions: { globals: { self: 'readonly', caches: 'readonly', fetch: 'readonly', Response: 'readonly', URL: 'readonly' } },
  },
  {
    // Architecture boundary: browser UI talks to shared domain types and the
    // app's API routes, never to server-only code or database adapters.
    files: ['components/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    ignores: ['app/api/**'],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/lib/server/*"], message: "UI code must not import server-only modules; call an app/api route instead." },
          { group: ["@/lib/sources/adapters/*"], message: "UI code must not import database adapters; use shared types or an app/api route." },
          { group: ["@/lib/sources/platforms/*"], message: "UI code must not import database platform clients; use shared types or an app/api route." }
        ]
      }]
    }
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off"
    }
  }
];

export default config;
