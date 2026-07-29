export const INSPECT_APP_PATTERNS = {
  LINT_PROBLEM_COUNT: /\d{1,9} problems?/gu,
  TSC_ERROR: /error TS\d{1,6}:/gu
} as const
