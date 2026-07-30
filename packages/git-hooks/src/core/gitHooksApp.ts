import {Mnemotek, MnemotekAppFactory} from '@studnicky/mnemotek'

import type {HookInstallResultEntity, HookListResultEntity} from '../entities/index.js'

import {HookActionEntity} from '../entities/index.js'
import {GIT_HOOKS_CONSTANTS} from './constants/GitHooksAppConstants.js'
import {HookInstaller} from './hookInstaller.js'

export class GitHooksApp {

  public static createGitHooksApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'Git hook installer: dispatches core.hooksPath to per-hook executable scripts and bundles protected-branch, large-file, and secret-scan pre-commit checks. Local-only, drives git directly — no server, no daemon.',
      name: 'git-hooks-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Install or list git hook dispatchers. install writes a core.hooksPath dispatcher per requested hook plus bundled pre-commit checks; list reports hooks currently installed under the configured directory.',
        name: 'hooks',
        runner: GitHooksApp.hooksRunner,
        schema: {
          additionalProperties: false,
          properties: {
            action: {description: 'install or list.',
              enum: HookActionEntity.Schema.enum,
              type: 'string'},
            dir: {description: `Directory (relative to the repo root) hooks are installed into. Defaults to '${GIT_HOOKS_CONSTANTS.DEFAULT_HOOKS_DIR}'.`,
              type: 'string'},
            force: {description: 'Install even when an existing .git/hooks/* or .husky/ setup is detected.',
              type: 'boolean'},
            hooks: {description: 'Hook names to install a dispatcher for (space-separated CLI values). Defaults to ["pre-commit"].',
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

  private static readonly hooksRunner = (payload: Record<string, unknown>): HookInstallResultEntity.Type | HookListResultEntity.Type => {

    const dir = typeof payload.dir === 'string'
      ? payload.dir
      : GIT_HOOKS_CONSTANTS.DEFAULT_HOOKS_DIR

    if (payload.action === 'list') {

      return HookInstaller.list({dir})

    }

    if (payload.action === 'install') {

      return HookInstaller.install({
        dir,
        force: payload.force === true,
        hooks: GitHooksApp.resolveHooks(payload)
      })

    }

    throw new TypeError(`Unknown hooks action '${String(payload.action)}'.`)

  }

  private static resolveHooks (payload: Record<string, unknown>): readonly string[] {

    if (Array.isArray(payload.hooks) && payload.hooks.every((entry): entry is string => {

      return typeof entry === 'string'

    })) {

      return payload.hooks

    }

    return ['pre-commit']

  }

}
