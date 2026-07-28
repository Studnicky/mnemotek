import js from '@eslint/js'
import boundaries from 'eslint-plugin-boundaries'
import perfectionist from 'eslint-plugin-perfectionist'
import unusedImports from 'eslint-plugin-unused-imports'
import { HexagonalSuite, plugin as studnickyPlugin, v8Plugin as studnickyV8Plugin } from '@studnicky/eslint-config'
import stylistic from '@stylistic/eslint-plugin'
import importX from 'eslint-plugin-import-x'
import regexp from 'eslint-plugin-regexp'
import sonarjs from 'eslint-plugin-sonarjs'
import tseslint from 'typescript-eslint'

const sourceFiles = ['src/**/*.ts']
const testFiles = ['tests/**/*.ts']

const studnickyRules = Object.fromEntries(
  Object.keys(studnickyPlugin.rules).map((name) => [`@studnicky/${name}`, 'error'])
)

const studnickyV8Rules = Object.fromEntries(
  Object.keys(studnickyV8Plugin.rules).map((name) => [`@studnicky/v8/${name}`, 'error'])
)

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'site/**', 'scripts/**', 'tests/**', 'test/**', '**/*.d.ts', 'eslint.config.mjs', 'packages/**']
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.all,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.tests.json'],
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: sourceFiles,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': tseslint.plugin,
      '@studnicky': studnickyPlugin,
      '@studnicky/v8': studnickyV8Plugin,
      boundaries,
      'import-x': importX,
      perfectionist,
      regexp,
      sonarjs,
      'unused-imports': unusedImports
    },
    settings: {
      'boundaries/elements': [
        {
          'pattern': 'src/core',
          'type': 'core'
        },
        {
          'pattern': 'src/adapters',
          'type': 'adapters'
        }
      ],
      'boundaries/files': [
        {
          'category': 'public-api',
          'pattern': 'src/index.ts'
        }
      ]
    },
    rules: {
      ...stylistic.configs.all.rules,
      ...perfectionist.configs['recommended-natural'].rules,
      ...studnickyRules,
      ...studnickyV8Rules,
      ...boundaries.configs.recommended.rules,
      'boundaries/dependencies': ['error', {
        'default': 'disallow',
        'policies': [
          {
            'allow': {
              'to': {
                'module': {
                  'origin': 'external'
                }
              }
            }
          },
          {
            'allow': {
              'to': {
                'module': {
                  'origin': 'core'
                }
              }
            }
          },
          {
            'from': {
              'file': {
                'categories': 'public-api'
              }
            },
            'allow': {
              'to': {
                'element': {
                  'types': ['adapters', 'core']
                }
              }
            }
          }
        ]
      }],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/prefer-destructuring': 'off',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-useless-default-assignment': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/naming-convention': ['error',
        {
          filter: '^Schema$',
          format: null,
          selector: 'variable'
        }
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      'arrow-body-style': ['error', 'always'],
      'complexity': ['error', { max: 15 }],
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'import-x/newline-after-import': 'error',
      'import-x/no-default-export': 'error',
      'no-console': 'error',
      'no-debugger': 'error',
      'no-nested-ternary': 'error',
      'perfectionist/sort-arrays': ['error', { type: 'natural', useConfigurationIf: {} }],
      'perfectionist/sort-union-types': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],
      'unused-imports/no-unused-imports': 'error'
    }
  },
  {
    files: testFiles,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.tests.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': tseslint.plugin,
      '@studnicky': studnickyPlugin,
      '@studnicky/v8': studnickyV8Plugin,
      'import-x': importX,
      perfectionist,
      regexp,
      sonarjs,
      'unused-imports': unusedImports
    },
    rules: {
      ...stylistic.configs.all.rules,
      ...perfectionist.configs['recommended-natural'].rules,
      ...studnickyRules,
      ...studnickyV8Rules,
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/prefer-destructuring': 'off',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-useless-default-assignment': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      'arrow-body-style': ['error', 'always'],
      'complexity': ['error', { max: 15 }],
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'import-x/newline-after-import': 'error',
      'import-x/no-default-export': 'error',
      'no-console': 'error',
      'no-debugger': 'error',
      'no-nested-ternary': 'error',
      'perfectionist/sort-arrays': ['error', { type: 'natural', useConfigurationIf: {} }],
      'perfectionist/sort-union-types': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],
      'unused-imports/no-unused-imports': 'error'
    }
  },
  {
    ...HexagonalSuite.create({
      'allowedImports': {
        'core': ['adapters', 'core'],
        'adapters': ['adapters']
      },
      'layers': ['core', 'adapters'],
      'sourceRoot': 'src'
    }),
    files: sourceFiles,
    rules: {
      ...boundaries.configs.recommended.rules,
      'boundaries/dependencies': ['error', {
        'default': 'disallow',
        'policies': [
          {
            'allow': {
              'to': {
                'module': {
                  'origin': 'external'
                }
              }
            }
          },
          {
            'allow': {
              'to': {
                'module': {
                  'origin': 'core'
                }
              }
            }
          },
          {
            'from': {
              'file': {
                'categories': 'public-api'
              }
            },
            'allow': {
              'to': {
                'element': {
                  'types': ['adapters', 'core']
                }
              }
            }
          }
        ]
      }],
    }
  }
)
