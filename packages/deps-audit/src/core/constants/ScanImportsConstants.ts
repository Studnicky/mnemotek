export const SCAN_IMPORTS_PATTERNS = {
  IMPORT_STATEMENT: /(?:import|export)\s+(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/gu,
  JS_EXTENSION: /\.js$/u,
  TS_EXTENSION: /\.ts$/u
} as const
