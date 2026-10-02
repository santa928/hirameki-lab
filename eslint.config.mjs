import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'docs/**', 'outputs/**', 'lib/engine/*-bank.ts'] },
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node } },
    plugins: { '@typescript-eslint': tsPlugin, 'react-hooks': hooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'no-dupe-args': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'valid-typeof': 'error' },
  },
];
