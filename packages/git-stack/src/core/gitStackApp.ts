import {Mnemotek, MnemotekAppFactory} from '@studnicky/mnemotek'

import type {StackResultEntity} from '../entities/index.js'

import {ExecCliTool} from './execCliTool.js'
import {StackArgvBuilder} from './stackArgvBuilder.js'

export class GitStackApp {

  public static createGitStackApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'Stacked-PR workflow driver: a thin passthrough to the gh-stack GitHub CLI extension. No reimplementation of stacked-PR logic, no server, no daemon.',
      name: 'git-stack-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Run a gh-stack action (e.g. create, sync, submit, log) with the given arguments, passed straight through to `gh stack <action> <...args>`.',
        name: 'stack',
        runner: GitStackApp.stackRunner,
        schema: {
          additionalProperties: false,
          properties: {
            action: {description: 'gh-stack action to run (e.g. create, sync, submit, log).',
              type: 'string'},
            argumentList: {description: 'Additional arguments passed through to the gh-stack action as-is.',
              items: {type: 'string'},
              type: 'array'}
          },
          required: ['action'],
          type: 'object'
        }
      }
    )
    return app

  }

  private static readonly stackRunner = (payload: Record<string, unknown>): StackResultEntity.Type => {

    if (typeof payload.action !== 'string' || payload.action.trim().length === 0) {

      throw new TypeError('stack requires a non-empty string "action".')

    }

    const argumentList = Array.isArray(payload.argumentList)
      ? payload.argumentList.filter((value): value is string => {

        return typeof value === 'string'

      })
      : []

    const argv = StackArgvBuilder.buildArgv({action: payload.action,
      argumentList})

    const output = ExecCliTool.run(
      'gh',
      argv
    )

    return {output}

  }

}
