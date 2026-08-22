import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Project-level pragmatic rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Error({ cause }) requires ES2022 — project targets ES2020. Disable.
      'prefer-error-cause': 'off',
      'unicorn/error-message': 'off',
      'preserve-caught-error': 'off',

      // no-useless-assignment catches real dead-code bugs — keep as error
      'no-useless-assignment': 'error',

      // react-hooks/exhaustive-deps catches real bugs — keep as warning
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);

