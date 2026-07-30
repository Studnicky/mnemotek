import {Mnemotek, MnemotekAppFactory, PayloadOptions} from '@studnicky/mnemotek'

import type {ConfigStandardsCheckResultEntity, ConfigStandardsFixResultEntity} from '../entities/index.js'

import {CodeownersStandards} from './codeownersStandards.js'
import {NETWORKED_OPTION_SCHEMA, ROOT_OPTION_SCHEMA} from './constants/ConfigStandardsConstants.js'
import {DevcontainerStandards} from './devcontainerStandards.js'
import {EditorconfigStandards} from './editorconfigStandards.js'
import {EnvcheckStandards} from './envcheckStandards.js'
import {GitignoreStandards} from './gitignoreStandards.js'
import {IssueTemplatesStandards} from './issueTemplatesStandards.js'
import {LockFile} from './lockFile.js'
import {PackageJsonStandards} from './packageJsonStandards.js'
import {PrettierStandards} from './prettierStandards.js'
import {StyleDriftStandards} from './styleDriftStandards.js'
import {TemplateSyncStandards} from './templateSyncStandards.js'
import {VersionPinStandards} from './versionPinStandards.js'
import {VscodeStandards} from './vscodeStandards.js'

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
        description: 'Check .gitignore, package.json, .editorconfig, .vscode config, prettier config, style drift, version pins, env vars, CODEOWNERS, devcontainer, issue templates, and template sync against the built-in standards set.',
        name: 'check',
        runner: ConfigStandardsApp.checkRunner,
        schema: {
          additionalProperties: false,
          properties: {
            networked: NETWORKED_OPTION_SCHEMA,
            root: ROOT_OPTION_SCHEMA
          },
          type: 'object'
        }
      },
      {
        description: 'Fix .gitignore, package.json, .editorconfig, .vscode config, prettier config, and version pins (append/merge/scaffold auto-fillable defaults).',
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
    const networked = payload.networked === true

    return {
      codeowners: CodeownersStandards.check(
        root,
        {networked}
      ),
      devcontainer: DevcontainerStandards.check(root),
      editorconfig: EditorconfigStandards.check(root),
      envcheck: EnvcheckStandards.check(root),
      gitignore: GitignoreStandards.check(root),
      issueTemplates: IssueTemplatesStandards.check(root),
      packageJson: PackageJsonStandards.check(root),
      prettier: PrettierStandards.check(root),
      styleDrift: StyleDriftStandards.check(root),
      templateSync: TemplateSyncStandards.check(
        root,
        {networked}
      ),
      versionPin: VersionPinStandards.check(root),
      vscode: VscodeStandards.check(root)
    }

  }

  private static readonly fixRunner = (payload: Record<string, unknown>): ConfigStandardsFixResultEntity.Type => {

    const root = PayloadOptions.resolveRoot(payload)

    return LockFile.withLock(
      root,
      () => {

        return {
          editorconfig: EditorconfigStandards.fix(root),
          gitignore: GitignoreStandards.fix(root),
          packageJson: PackageJsonStandards.fix(root),
          prettier: PrettierStandards.fix(root),
          versionPin: VersionPinStandards.fix(root),
          vscode: VscodeStandards.fix(root)
        }

      }
    )

  }

}
