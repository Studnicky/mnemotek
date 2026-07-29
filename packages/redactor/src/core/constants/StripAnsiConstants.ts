export const STRIP_ANSI_PATTERNS = {
  ANSI_ESCAPE: new RegExp(
    `${String.fromCharCode(27)}\\[[0-9;]*[a-zA-Z]`,
    'gu'
  ),
  BLANK_LINE_RUN: /\n{3,}/gu,
  CARRIAGE_RETURN_LINE: /^.*\r(?!\n)/gmu
} as const
