import {Mnemotek, MnemotekAppFactory, PayloadOptions} from '@studnicky/mnemotek'

import type {ConfigStandardsCheckResultEntity, ConfigStandardsFixResultEntity} from '../entities/index.js'

import {GitignoreStandards} from './gitignoreStandards.js'
import {PackageJsonStandards} from './packageJsonStandards.js'

const ROOT_OPTION_SCHEMA = {
  description: 'Project root. Defaults to the current directory.',
  type: 'string'
}

export class ConfigStandardsApp {

  public static createConfigStandardsApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'Check and fix common project config files against a small built-in standards set. No server, no external services.',
      name: 'config-standards-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Check .gitignore and package.json against the built-in standards set.',
        name: 'check',
        runner: ConfigStandardsApp.checkRunner,
        schema: {
          additionalProperties: false,
          properties: {
            root: ROOT_OPTION_SCHEMA
          },
          type: 'object'
        }
      },
      {
        description: 'Fix .gitignore (append missing lines) and package.json (fill auto-fillable defaults like license).',
        name: 'fix',
        runner: ConfigStandardsApp.fixRunner,
        schema: {
          additionalProperties: false,
          properties: {
            root: ROOT_OPTION_SCHEMA
          },
          type: 'object'
        }
      }
    )
    return app

  }

  private static readonly checkRunner = (payload: Record<string, unknown>): ConfigStandardsCheckResultEntity.Type => {

    const root = PayloadOptions.resolveRoot(payload)

    return {
      gitignore: GitignoreStandards.check(root),
      packageJson: PackageJsonStandards.check(root)
    }

  }

  private static readonly fixRunner = (payload: Record<string, unknown>): ConfigStandardsFixResultEntity.Type => {

    const root = PayloadOptions.resolveRoot(payload)

    return {
      gitignore: GitignoreStandards.fix(root),
      packageJson: PackageJsonStandards.fix(root)
    }

  }

}
