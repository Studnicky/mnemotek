import type {ExecFileSyncOptionsWithStringEncoding} from 'node:child_process'

import {execFileSync} from 'node:child_process'
import process from 'node:process'

export class ExecCliTool {

  public static run (binary: string, argumentList: readonly string[], options: {allowFail?: boolean;
    environment?: Record<string, string>;
    timeout?: number;} = {}): string {

    const execOptions: ExecFileSyncOptionsWithStringEncoding = {
      encoding: 'utf8',
      timeout: options.timeout
    }

    if (options.environment !== undefined) {

      execOptions.env = {...process.env,
        ...options.environment}

    }

    try {

      return execFileSync(
        binary,
        [...argumentList],
        execOptions
      ).trim()

    } catch (error) {

      if (options.allowFail === true) {

        return ''

      }

      throw error

    }

  }

}
