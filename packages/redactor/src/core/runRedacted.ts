import {execFileSync} from 'node:child_process'

import type {RunRedactedResultEntity} from '../entities/index.js'

import {GainTracker} from './gainTracker.js'
import {StripAnsi} from './stripAnsi.js'

export class RunRedacted {

  public static runRedacted (input: {
    readonly argumentList?: readonly string[];
    readonly command: string;
    readonly root?: string;
  }): RunRedactedResultEntity.Type {

    const argumentList = input.argumentList ?? []
    const {exitCode, rawOutput} = RunRedacted.execute(
      input.command,
      argumentList
    )

    const redacted = StripAnsi.redactText(rawOutput)
    const bytesBefore = Buffer.byteLength(
      rawOutput,
      'utf8'
    )
    const bytesAfter = Buffer.byteLength(
      redacted,
      'utf8'
    )

    GainTracker.recordGain({
      bytesAfter,
      bytesBefore,
      command: RunRedacted.toArgumentList(
        input.command,
        ...argumentList
      ).join(' '),
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

  private static execute (command: string, argumentList: readonly string[]): {exitCode: number;
    rawOutput: string;} {

    try {

      const rawOutput = execFileSync(
        command,
        RunRedacted.toArgumentList(...argumentList),
        {encoding: 'utf8',
          stdio: [
            'ignore',
            'pipe',
            'pipe'
          ]}
      )
      return {exitCode: 0,
        rawOutput}

    } catch (error) {

      const execError = error as {readonly status?: number;
        readonly stdout?: string;}
      return {
        exitCode: execError.status ?? 1,
        rawOutput: execError.stdout ?? ''
      }

    }

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
