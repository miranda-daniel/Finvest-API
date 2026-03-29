// @ts-check
'use strict';

const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

// flat/recommended is an array of 3 configs:
//   [0] language options + plugins
//   [1] eslint:recommended subset (with TS overrides)
//   [2] @typescript-eslint/recommended rules
const flatRecommended = tseslint.configs['flat/recommended'];

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // Global ignores (replaces .eslintignore)
  {
    ignores: ['node_modules/**', 'build/**', 'coverage/**', 'eslint.config.js'],
  },

  // Base config for all JS/TS files
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        // ES2021 globals
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Symbol: 'readonly',
        Proxy: 'readonly',
        Reflect: 'readonly',
        BigInt: 'readonly',
        AggregateError: 'readonly',
        FinalizationRegistry: 'readonly',
        WeakRef: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      // eslint:recommended rules (via flat/recommended entry[1])
      ...flatRecommended[1].rules,

      // @typescript-eslint/recommended rules (via flat/recommended entry[2])
      ...flatRecommended[2].rules,

      // Disable ESLint core rules that conflict with prettier
      ...prettierConfig.rules,

      // Prettier as an ESLint rule
      'prettier/prettier': 'error',

      // Allow unused variables/args prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Allow empty interfaces (required for type aliases extending Partial)
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'always' },
      ],

      // Custom rules from original .eslintrc.yml
      camelcase: ['error', { properties: 'always' }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      curly: ['error', 'all'],
      'no-fallthrough': 'error',
      'no-undef': 'error',
      'no-use-before-define': [
        'error',
        { functions: false, classes: true, variables: true },
      ],
      'max-len': [
        'warn',
        {
          code: 120,
          comments: 120,
          ignoreComments: false,
          ignoreTrailingComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          tabWidth: 2,
        },
      ],
    },
  },

  // Test files: add jest globals
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/__tests__/**/*.ts', '**/jest.setup.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },
];
