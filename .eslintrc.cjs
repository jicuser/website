module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  extends: ['eslint:recommended'],
  plugins: ['react-hooks'],
  rules: { 'no-unused-vars': 'off', 'no-empty': ['error', { allowEmptyCatch: true }], 'react-hooks/rules-of-hooks': 'error' },
  ignorePatterns: ['dist/', 'node_modules/', 'supabase/'],
};
