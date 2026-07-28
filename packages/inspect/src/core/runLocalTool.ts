import {execFileSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {dirname, join} from 'node:path'

export interface LocalToolRunResult {
  readonly [key: string]: unknown
  readonly exitCode: number
  readonly output: string
  readonly ran: string
}

/** Walk up from root looking for node_modules/.bin/<binaryName>, like Node's own module resolution. Never touches the network — falls back to a bare PATH lookup. */
function resolveBinary (root: string, binaryName: string): string {

  let current = root

  for (;;) {

    const candidate = join(current, 'node_modules', '.bin', binaryName)

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

export function runLocalTool (input: {
  readonly args: readonly string[]
  readonly binaryName: string
  readonly root: string
}): LocalToolRunResult {

  const resolved = resolveBinary(input.root, input.binaryName)

  let output: string
  let exitCode = 0

  try {

    output = execFileSync(
      resolved,
      [...input.args],
      {cwd: input.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}
    )

  } catch (error) {

    const execError = error as {readonly status?: number; readonly stdout?: string; readonly stderr?: string}
    output = `${execError.stdout ?? ''}${execError.stderr ?? ''}`
    exitCode = execError.status ?? 1

  }

  return {
    exitCode,
    output,
    ran: `${resolved} ${input.args.join(' ')}`
  }

}
