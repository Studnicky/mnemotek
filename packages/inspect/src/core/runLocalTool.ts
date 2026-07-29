import {execFileSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {dirname, join} from 'node:path'

import type {LocalToolRunResultEntity} from '../entities/index.js'

export class RunLocalTool {

  public static run (input: {argumentList: readonly string[];
    binaryName: string;
    root: string;}): LocalToolRunResultEntity.Type {

    const resolved = RunLocalTool.resolveBinary(
      input.root,
      input.binaryName
    )

    let output: string
    let exitCode = 0

    try {

      output = execFileSync(
        resolved,
        [...input.argumentList],
        {cwd: input.root,
          encoding: 'utf8',
          stdio: [
            'ignore',
            'pipe',
            'pipe'
          ]}
      )

    } catch (error) {

      const execError = error as {status?: number;
        stderr?: string;
        stdout?: string;}
      output = `${execError.stdout ?? ''}${execError.stderr ?? ''}`
      exitCode = execError.status ?? 1

    }

    return {
      exitCode,
      output,
      ran: `${resolved} ${input.argumentList.join(' ')}`
    }

  }

  public static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

  /** Walk up from root looking for node_modules/.bin/<binaryName>, like Node's own module resolution. Never touches the network — falls back to a bare PATH lookup. */
  private static resolveBinary (root: string, binaryName: string): string {

    let current = root

    for (;;) {

      const candidate = join(
        current,
        'node_modules',
        '.bin',
        binaryName
      )

      if (existsSync(candidate)) {

        return candidate

      }

      const parent = dirname(current)

      if (parent === current) {

        return binaryName

      }

      current = parent

    }

  }

}
