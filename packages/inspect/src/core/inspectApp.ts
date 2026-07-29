import {Mnemotek, MnemotekAppFactory, PayloadOptions} from '@studnicky/mnemotek'

import {INSPECT_APP_PATTERNS} from './constants/InspectAppPatterns.js'
import {RunLocalTool} from './runLocalTool.js'

export class InspectApp {

  public static createInspectApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'Run the local project\'s own tsc and eslint and report structured results. No server, no bundled compiler.',
      name: 'inspect-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Run the project\'s own tsc --noEmit and report pass/fail with an error count.',
        name: 'typecheck',
        runner: InspectApp.typecheckRunner,
        schema: {
          additionalProperties: false,
          properties: {
            project: {description: 'Path to tsconfig.json, relative to root.',
              type: 'string'},
            root: {description: 'Project root. Defaults to the current directory.',
              type: 'string'}
          },
          type: 'object'
        }
      },
      {
        description: 'Run the project\'s own eslint and report pass/fail with error/warning counts.',
        name: 'lint',
        runner: InspectApp.lintRunner,
        schema: {
          additionalProperties: false,
          properties: {
            root: {description: 'Project root. Defaults to the current directory.',
              type: 'string'},
            target: {description: 'Path/glob to lint. Defaults to ".".',
              type: 'string'}
          },
          type: 'object'
        }
      }
    )
    return app

  }

  private static countMatches (output: string, pattern: RegExp): number {

    const result = [...output.matchAll(pattern)].length
    return result

  }

  private static readonly lintRunner = (payload: Record<string, unknown>): Record<string, unknown> => {

    const root = PayloadOptions.resolveRoot(payload)
    const target = typeof payload.target === 'string'
      ? payload.target
      : '.'
    const result = RunLocalTool.run({
      argumentList: RunLocalTool.toArgumentList(
        target,
        '--max-warnings',
        '0'
      ),
      binaryName: 'eslint',
      root
    })
    const problemCount = InspectApp.countMatches(
      result.output,
      INSPECT_APP_PATTERNS.LINT_PROBLEM_COUNT
    )

    return {...result,
      ok: result.exitCode === 0,
      problemCount}

  }

  private static readonly typecheckRunner = (payload: Record<string, unknown>): Record<string, unknown> => {

    const root = PayloadOptions.resolveRoot(payload)
    const project = typeof payload.project === 'string'
      ? payload.project
      : 'tsconfig.json'
    const result = RunLocalTool.run({
      argumentList: RunLocalTool.toArgumentList(
        '--project',
        project,
        '--noEmit'
      ),
      binaryName: 'tsc',
      root
    })
    const errorCount = InspectApp.countMatches(
      result.output,
      INSPECT_APP_PATTERNS.TSC_ERROR
    )

    return {...result,
      errorCount,
      ok: result.exitCode === 0}

  }

}
