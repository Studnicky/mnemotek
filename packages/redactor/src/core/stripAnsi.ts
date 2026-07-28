const ESC = String.fromCharCode(27)
const ANSI_PATTERN = new RegExp(
  `${ESC}\\[[0-9;]*[a-zA-Z]`,
  'gu'
)
const CARRIAGE_RETURN_LINE_PATTERN = /^.*\r(?!\n)/gmu
const BLANK_LINE_RUN_PATTERN = /\n{3,}/gu

export function stripAnsi (input: string): string {

  return input.replace(ANSI_PATTERN, '')

}

export function collapseSpinnerLines (input: string): string {

  return input.replace(CARRIAGE_RETURN_LINE_PATTERN, '')

}

export function collapseBlankLines (input: string): string {

  return input.replace(BLANK_LINE_RUN_PATTERN, '\n\n')

}

export function redactText (input: string): string {

  return collapseBlankLines(collapseSpinnerLines(stripAnsi(input)))

}
