import {Mnemotek} from '@studnicky/mnemotek'

import {runLocalTool} from './runLocalTool.js'

function resolveRoot (payload: Record<string, unknown>): string {

  return typeof payload.root === 'string' ? payload.root : process.cwd()

}

function countMatches (output: string, pattern: RegExp): number {

  return [...output.matchAll(pattern)].length

}

export function createInspectApp (): Mnemotek {

  const app = new Mnemotek({
    description: 'Run the local project\'s own tsc and eslint and report structured results. No server, no bundled compiler.',
    name: 'inspect-tool',
    version: '0.1.0'
  })

  app.command({
    description: 'Run the project\'s own tsc --noEmit and report pass/fail with an error count.',
    name: 'typecheck',
    runner: (payload) => {

      const root = resolveRoot(payload)
      const project = typeof payload.project === 'string' ? payload.project : 'tsconfig.json'
      const result = runLocalTool({
        args: ['--project', project, '--noEmit'],
        binaryName: 'tsc',
        root
      })
      const errorCount = countMatches(result.output, /error TS\d+:/gu)

      return {...result, errorCount, ok: result.exitCode === 0}

    },
    schema: {
      additionalProperties: false,
      properties: {
        project: {description: 'Path to tsconfig.json, relative to root.', type: 'string'},
        root: {description: 'Project root. Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Run the project\'s own eslint and report pass/fail with error/warning counts.',
    name: 'lint',
    runner: (payload) => {

      const root = resolveRoot(payload)
      const target = typeof payload.target === 'string' ? payload.target : '.'
      const result = runLocalTool({
        args: [target, '--max-warnings', '0'],
        binaryName: 'eslint',
        root
      })
      const problemCount = countMatches(result.output, /\d+ problems?/gu)

      return {...result, ok: result.exitCode === 0, problemCount}

    },
    schema: {
      additionalProperties: false,
      properties: {
        root: {description: 'Project root. Defaults to the current directory.', type: 'string'},
        target: {description: 'Path/glob to lint. Defaults to ".".', type: 'string'}
      },
      type: 'object'
    }
  })

  return app

}
