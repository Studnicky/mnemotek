import {Mnemotek} from '@studnicky/mnemotek'

import {checkGitignore} from './checkGitignore.js'
import {checkPackageJson} from './checkPackageJson.js'
import {fixGitignore} from './fixGitignore.js'
import {fixPackageJson} from './fixPackageJson.js'

function resolveRoot (payload: Record<string, unknown>): string {

  return typeof payload.root === 'string' ? payload.root : process.cwd()

}

export function createConfigStandardsApp (): Mnemotek {

  const app = new Mnemotek({
    description: 'Check and fix common project config files against a small built-in standards set. No server, no external services.',
    name: 'config-standards-tool',
    version: '0.1.0'
  })

  app.command({
    description: 'Check .gitignore and package.json against the built-in standards set.',
    name: 'check',
    runner: (payload) => {

      const root = resolveRoot(payload)

      return {
        gitignore: checkGitignore(root),
        packageJson: checkPackageJson(root)
      }

    },
    schema: {
      additionalProperties: false,
      properties: {
        root: {description: 'Project root. Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Fix .gitignore (append missing lines) and package.json (fill auto-fillable defaults like license).',
    name: 'fix',
    runner: (payload) => {

      const root = resolveRoot(payload)

      return {
        gitignore: fixGitignore(root),
        packageJson: fixPackageJson(root)
      }

    },
    schema: {
      additionalProperties: false,
      properties: {
        root: {description: 'Project root. Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  return app

}
