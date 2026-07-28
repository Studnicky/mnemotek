import {execFileSync} from 'node:child_process'

import {recordGain} from './gainTracker.js'
import {redactText} from './stripAnsi.js'

export interface RunRedactedResult {
  readonly [key: string]: unknown
  readonly bytesAfter: number
  readonly bytesBefore: number
  readonly bytesSaved: number
  readonly exitCode: number
  readonly output: string
}

export function runRedacted (input: {
  readonly args?: readonly string[]
  readonly command: string
  readonly root?: string
}): RunRedactedResult {

  const args = input.args ?? []
  let rawOutput: string
  let exitCode = 0

  try {

    rawOutput = execFileSync(
      input.command,
      [...args],
      {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}
    )

  } catch (error) {

    const execError = error as {readonly status?: number; readonly stdout?: string}
    rawOutput = execError.stdout ?? ''
    exitCode = execError.status ?? 1

  }

  const redacted = redactText(rawOutput)
  const bytesBefore = Buffer.byteLength(rawOutput, 'utf8')
  const bytesAfter = Buffer.byteLength(redacted, 'utf8')

  recordGain({
    bytesAfter,
    bytesBefore,
    command: [input.command, ...args].join(' '),
    root: input.root,
    timestamp: new Date().toISOString()
  })

  return {
    bytesAfter,
    bytesBefore,
    bytesSaved: bytesBefore - bytesAfter,
    exitCode,
    output: redacted
  }

}
