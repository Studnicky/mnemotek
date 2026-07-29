import {Mnemotek, MnemotekAppFactory} from '@studnicky/mnemotek'

import type {GainSummaryEntity, RunRedactedResultEntity} from '../entities/index.js'

import {GainTracker} from './gainTracker.js'
import {RunRedacted} from './runRedacted.js'
import {StripAnsi} from './stripAnsi.js'

export class RedactorApp {

  public static createRedactorApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'Strip ANSI/spinner noise from command output and track token savings. No server, no external filters.',
      name: 'redactor-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Redact raw text: strip ANSI escapes, collapse spinner overwrites, collapse blank-line runs.',
        name: 'text',
        runner: RedactorApp.textRunner,
        schema: {
          additionalProperties: false,
          properties: {
            input: {description: 'Raw text to redact.',
              type: 'string'}
          },
          required: ['input'],
          type: 'object'
        }
      },
      {
        description: 'Run a command, redact its output, and record token savings.',
        name: 'run',
        runner: RedactorApp.runRunner,
        schema: {
          additionalProperties: false,
          properties: {
            argumentList: {description: 'Arguments to pass to the command.',
              items: {type: 'string'},
              type: 'array'},
            command: {description: 'Executable to run.',
              type: 'string'},
            root: {description: 'Directory to store the gain log under. Defaults to the current directory.',
              type: 'string'}
          },
          required: ['command'],
          type: 'object'
        }
      },
      {
        description: 'Show cumulative token/byte savings across all recorded runs.',
        name: 'gain',
        runner: RedactorApp.gainRunner,
        schema: {
          additionalProperties: false,
          properties: {
            root: {description: 'Directory the gain log is stored under. Defaults to the current directory.',
              type: 'string'}
          },
          type: 'object'
        }
      }
    )
    return app

  }

  private static readonly gainRunner = (payload: Record<string, unknown>): GainSummaryEntity.Type => {

    const result = GainTracker.readGain({
      root: typeof payload.root === 'string'
        ? payload.root
        : undefined
    })
    return result

  }

  private static readonly runRunner = (payload: Record<string, unknown>): RunRedactedResultEntity.Type => {

    if (typeof payload.command !== 'string') {

      throw new TypeError('run requires a string "command".')

    }

    const argumentList = Array.isArray(payload.argumentList)
      ? payload.argumentList.filter((value): value is string => {

        return typeof value === 'string'

      })
      : []

    return RunRedacted.runRedacted({
      argumentList,
      command: payload.command,
      root: typeof payload.root === 'string'
        ? payload.root
        : undefined
    })

  }

  private static readonly textRunner = (payload: Record<string, unknown>): {output: string} => {

    if (typeof payload.input !== 'string') {

      throw new TypeError('text requires a string "input".')

    }

    return {output: StripAnsi.redactText(payload.input)}

  }

}
