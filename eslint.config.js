import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  {
    ignores: ['build', 'node_modules'],
  },
  { 
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'], 
    plugins: { js }, 
    extends: ['js/recommended'], 
    languageOptions: { globals: globals.browser },
  },
  ...tseslint.configs.recommended,
  prettier,
]);
