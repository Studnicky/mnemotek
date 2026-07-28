import {Mnemotek} from '@studnicky/mnemotek'

import {readGain} from './gainTracker.js'
import {runRedacted} from './runRedacted.js'
import {redactText} from './stripAnsi.js'

export function createRedactorApp (): Mnemotek {

  const app = new Mnemotek({
    description: 'Strip ANSI/spinner noise from command output and track token savings. No server, no external filters.',
    name: 'redactor-tool',
    version: '0.1.0'
  })

  app.command({
    description: 'Redact raw text: strip ANSI escapes, collapse spinner overwrites, collapse blank-line runs.',
    name: 'text',
    runner: (payload) => {

      if (typeof payload.input !== 'string') {

        throw new TypeError('text requires a string "input".')

      }

      return {output: redactText(payload.input)}

    },
    schema: {
      additionalProperties: false,
      properties: {
        input: {description: 'Raw text to redact.', type: 'string'}
      },
      required: ['input'],
      type: 'object'
    }
  })

  app.command({
    description: 'Run a command, redact its output, and record token savings.',
    name: 'run',
    runner: (payload) => {

      if (typeof payload.command !== 'string') {

        throw new TypeError('run requires a string "command".')

      }

      const args = Array.isArray(payload.args)
        ? payload.args.filter((value): value is string => typeof value === 'string')
        : []

      return runRedacted({
        args,
        command: payload.command,
        root: typeof payload.root === 'string' ? payload.root : undefined
      })

    },
    schema: {
      additionalProperties: false,
      properties: {
        args: {description: 'Arguments to pass to the command.', items: {type: 'string'}, type: 'array'},
        command: {description: 'Executable to run.', type: 'string'},
        root: {description: 'Directory to store the gain log under. Defaults to the current directory.', type: 'string'}
      },
      required: ['command'],
      type: 'object'
    }
  })

  app.command({
    description: 'Show cumulative token/byte savings across all recorded runs.',
    name: 'gain',
    runner: (payload) => readGain({
      root: typeof payload.root === 'string' ? payload.root : undefined
    }),
    schema: {
      additionalProperties: false,
      properties: {
        root: {description: 'Directory the gain log is stored under. Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  return app

}
