module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:valtio/recommended',
  ],
  env: {
    browser: true,
    es6: true,
    jest: true,
    node: true,
  },
  rules: {
    '@typescript-eslint/ban-types': 0,
    '@typescript-eslint/no-explicit-any': 0,
  },
};
