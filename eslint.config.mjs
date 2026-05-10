import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettierConfig from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/.next/**', '**/coverage/**', '**/node_modules/**', '**/out/**'],
  },
  js.configs.recommended,
  ...nextVitals,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      complexity: ['error', 20],
      'max-depth': ['error', 4],
      'max-len': [
        'error',
        {
          code: 100,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreUrls: true,
        },
      ],
      'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettierConfig,
);
