export const DOCTOR_CHECK_PATTERNS = {
  ALIAS_LINE: /^\s*alias\s+([\w-]+)=(.*)$/u,
  PATH_ASSIGNMENT: /^\s*(?:export\s+)?PATH=/u,
  PATH_GUARD: /case\s+":\$PATH:"\s+in|typeset\s+-U\s+path/u,
  SECRET_EXPORT: /export\s+([A-Z0-9_]*(?:_KEY|_TOKEN|_SECRET))\s*=\s*(.+)$/gimu,
  VARIABLE_REFERENCE: /^["']?\$|^["']?`/u
} as const
