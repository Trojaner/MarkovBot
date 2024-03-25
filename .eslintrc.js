module.exports = {
  plugins: [
    'no-relative-import-paths',
    'unused-imports',
    'prettier',
    '@next/next',
  ],
  extends: ['next', 'prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        printWidth: 80,
        tabWidth: 2,
        trailingComma: 'all',
        singleQuote: true,
        semi: true,
        importOrder: ['^(.*).(s)?css$'],
        importOrderSeparation: true,
        importOrderSortSpecifiers: true,
        useTabs: false,
        endOfLine: 'auto',
      },
    ],
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/no-explicit-any': 0,
    'no-console': 0, // todo: remove
    // "no-console": ["error", { allow: ["warn", "error"] }],
    'jsx-boolean-value': 0,
    'jsx-no-lambda': 0,
    'unused-imports/no-unused-imports': ['error'],
    'unused-imports/no-unused-vars': ['error', { vars: 'all' }],
    'no-relative-import-paths/no-relative-import-paths': [
      'warn',
      { allowSameFolder: true, prefix: '@/' },
    ],
  },
};
