import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...(nextVitals.default || nextVitals),
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'node_modules/**'],
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off"
    }
  }
];

export default config;
