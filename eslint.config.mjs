import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...(nextVitals.default || nextVitals),
  {
    // .kilo holds another tool's git worktree, .mimocode its local state.
    ignores: ['.next/**', 'out/**', 'build/**', 'node_modules/**', '.kilo/**', '.mimocode/**'],
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off"
    }
  }
];

export default config;
