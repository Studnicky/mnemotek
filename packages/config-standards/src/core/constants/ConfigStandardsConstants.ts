export const REQUIRED_GITIGNORE_LINES = [
  '*.tsbuildinfo',
  '.redactor/',
  'dist/',
  'node_modules/'
] as const

export const REQUIRED_PACKAGE_FIELDS = [
  'engines',
  'license',
  'repository'
] as const

export const AUTO_FILLABLE_PACKAGE_DEFAULTS = {
  license: 'MIT'
} as const

export const REQUIRED_EDITORCONFIG_LINES = [
  '[*]',
  'charset = utf-8',
  'end_of_line = lf',
  'indent_style = space',
  'insert_final_newline = true',
  'root = true',
  'trim_trailing_whitespace = true'
] as const

export const VSCODE_EXTENSIONS_FILE = '.vscode/extensions.json'
export const VSCODE_SETTINGS_FILE = '.vscode/settings.json'

export const VSCODE_EXTENSION_RECOMMENDATIONS = {
  eslint: {
    configGlobs: [
      '.eslintrc',
      '.eslintrc.cjs',
      '.eslintrc.js',
      '.eslintrc.json',
      'eslint.config.cjs',
      'eslint.config.js',
      'eslint.config.mjs'
    ],
    extensionId: 'dbaeumer.vscode-eslint'
  },
  prettier: {
    configGlobs: [
      '.prettierrc',
      '.prettierrc.cjs',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yaml',
      '.prettierrc.yml'
    ],
    extensionId: 'esbenp.prettier-vscode'
  },
  tailwind: {
    configGlobs: [
      'tailwind.config.cjs',
      'tailwind.config.js',
      'tailwind.config.ts'
    ],
    extensionId: 'bradlc.vscode-tailwindcss'
  }
} as const

export const VSCODE_RECOMMENDED_SETTINGS = {
  'editor.codeActionsOnSave': {'source.fixAll.eslint': 'explicit'},
  'editor.defaultFormatter': 'esbenp.prettier-vscode',
  'editor.formatOnSave': true
} as const

export const PRETTIER_CONFIG_FILES = [
  '.prettierrc',
  '.prettierrc.cjs',
  '.prettierrc.js',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml'
] as const

export const PRETTIER_DEFAULT_CONFIG = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all'
} as const

export const ESLINT_CONFIG_FILES = [
  '.eslintrc',
  '.eslintrc.cjs',
  '.eslintrc.js',
  '.eslintrc.json',
  'eslint.config.cjs',
  'eslint.config.js',
  'eslint.config.mjs'
] as const

export const ENVCHECK_SOURCE_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx'
] as const

export const ENVCHECK_SKIPPED_DIRECTORIES = [
  '.git',
  'dist',
  'node_modules'
] as const

export const VERSION_PIN_FILES = [
  '.node-version',
  '.nvmrc',
  '.tool-versions'
] as const

export const ROOT_OPTION_SCHEMA = {
  description: 'Project root. Defaults to the current directory.',
  type: 'string'
} as const

export const NETWORKED_OPTION_SCHEMA = {
  default: false,
  description: 'Also run the network-dependent portion of codeowners and template-sync (shells to `gh api`). Defaults to false; both rules still run their local-only checks either way.',
  type: 'boolean'
} as const

export const DEVCONTAINER_CANDIDATE_PATHS = [
  '.devcontainer/devcontainer.json',
  'devcontainer.json'
] as const

export const DEVCONTAINER_LOCK_CANDIDATE_PATHS = [
  '.devcontainer/devcontainer-lock.json',
  'devcontainer-lock.json'
] as const

export const JSONC_BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//gu
export const JSONC_LINE_COMMENT_PATTERN = /(^|\s)\/\/.*$/gmu

export const ISSUE_TEMPLATE_DIR = '.github/ISSUE_TEMPLATE'
export const ISSUE_TEMPLATE_CONFIG_FILE_NAME = 'config.yml'
export const ISSUE_TEMPLATE_EXTENSIONS = new Set([
  '.md',
  '.yaml',
  '.yml'
])
export const REQUIRED_FRONT_MATTER_KEYS = ['name'] as const
export const ALTERNATE_FRONT_MATTER_KEYS = [
  'about',
  'title'
] as const
export const FRONT_MATTER_KEY_PATTERN = /^([A-Za-z_][\w-]*):/gmu
export const MARKDOWN_FRONT_MATTER_BLOCK_PATTERN = /^---\n([\s\S]*?)\n---/u
export const ISSUE_TEMPLATE_CONFIG_REFERENCE_PATTERN = /:\s*([\w-]+\.(?:md|yml|yaml))\s*$/gmu

export const ENVIRONMENT_VARIABLE_REFERENCE_PATTERN = /(?:process\.env|import\.meta\.env)\.([A-Za-z_][A-Za-z0-9_]*)/gu
export const ENVIRONMENT_EXAMPLE_KEY_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*=/gmu

export const EDITORCONFIG_INDENT_STYLE_PATTERN = /^indent_style\s*=\s*(\S+)/mu
export const EDITORCONFIG_INDENT_SIZE_PATTERN = /^indent_size\s*=\s*(\d+)/mu

export const TOOL_VERSIONS_NODE_LINE_PATTERN = /^nodejs\s+\S+/mu
export const TOOL_VERSIONS_NODE_VALUE_PATTERN = /^nodejs\s+(\S+)/mu

export const GLOB_SPECIAL_CHARACTER_PATTERN = /[.+^${}()|[\]\\]/gu
export const CODEOWNERS_LINE_SPLIT_PATTERN = /\s+/u
