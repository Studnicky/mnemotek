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
