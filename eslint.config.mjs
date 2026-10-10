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
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off"
    }
  }
];

export default config;
