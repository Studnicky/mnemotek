import {STRIP_ANSI_PATTERNS} from './constants/StripAnsiConstants.js'

export class StripAnsi {

  public static collapseBlankLines (input: string): string {

    const result = input.replace(
      STRIP_ANSI_PATTERNS.BLANK_LINE_RUN,
      '\n\n'
    )
    return result

  }

  public static collapseSpinnerLines (input: string): string {

    const result = input.replace(
      STRIP_ANSI_PATTERNS.CARRIAGE_RETURN_LINE,
      ''
    )
    return result

  }

  public static redactText (input: string): string {

    const result = StripAnsi.collapseBlankLines(StripAnsi.collapseSpinnerLines(StripAnsi.stripAnsi(input)))
    return result

  }

  public static stripAnsi (input: string): string {

    const result = input.replace(
      STRIP_ANSI_PATTERNS.ANSI_ESCAPE,
      ''
    )
    return result

  }

}
