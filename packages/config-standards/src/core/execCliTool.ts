import {execFileSync} from 'node:child_process'

export class ExecCliTool {

  public static run (binary: string, argumentList: readonly string[], options: {allowFail?: boolean;
    cwd?: string;
    timeout?: number;} = {}): string {

    try {

      return execFileSync(
        binary,
        [...argumentList],
        {cwd: options.cwd,
          encoding: 'utf8',
          timeout: options.timeout}
      ).trim()

    } catch (error) {

      if (options.allowFail === true) {

        return ''

      }

      throw error

    }

  }

}
