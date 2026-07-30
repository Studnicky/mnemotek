import {existsSync, mkdirSync, readdirSync} from 'node:fs'
import {join} from 'node:path'

import type {HookInstallResultEntity, HookListResultEntity} from '../entities/index.js'

import {AtomicWrite} from './atomicWrite.js'
import {CHECK_SCRIPTS} from './constants/CheckScriptConstants.js'
import {GIT_HOOKS_CONSTANTS} from './constants/GitHooksAppConstants.js'
import {ExecCliTool} from './execCliTool.js'
import {LockFile} from './lockFile.js'

export class HookInstaller {

  public static install (payload: {dir: string;
    force: boolean;
    hooks: readonly string[];}): HookInstallResultEntity.Type {

    const result = LockFile.withLock(() => {

      const conflicts = HookInstaller.detectConflicts(payload.dir)

      if (conflicts.length > 0 && !payload.force) {

        throw new Error(`Refusing to install: existing hook setup detected (${conflicts.join(', ')}). Pass force:true to override.`)

      }

      const hooksDir = join(
        HookInstaller.repositoryRoot(),
        payload.dir
      )

      mkdirSync(
        hooksDir,
        {recursive: true}
      )
      ExecCliTool.run(
        'git',
        HookInstaller.toArgumentList(
          'config',
          'core.hooksPath',
          payload.dir
        )
      )

      const installed: string[] = []

      for (const hookName of payload.hooks) {

        AtomicWrite.writeExecutableFile(
          join(
            hooksDir,
            hookName
          ),
          HookInstaller.dispatcherScript(hookName)
        )
        installed.push(hookName)

        if (hookName === 'pre-commit') {

          HookInstaller.installBundledChecks(hooksDir)

        }

      }

      return {hooksPath: payload.dir,
        installed}

    })
    return result

  }

  public static list (payload: {dir: string}): HookListResultEntity.Type {

    const hooksDir = join(
      HookInstaller.repositoryRoot(),
      payload.dir
    )

    if (!existsSync(hooksDir)) {

      return {hooks: []}

    }

    const knownHookNames: readonly string[] = GIT_HOOKS_CONSTANTS.KNOWN_GIT_HOOK_NAMES
    const hooks = readdirSync(hooksDir).
      filter((entry) => {

        const result = knownHookNames.includes(entry); return result

      }).
      sort()

    return {hooks}

  }

  private static detectConflicts (dir: string): string[] {

    const currentHooksPath = ExecCliTool.run(
      'git',
      HookInstaller.toArgumentList(
        'config',
        '--get',
        'core.hooksPath'
      ),
      {allowFail: true}
    )

    if (currentHooksPath === dir) {

      return []

    }

    const conflicts: string[] = []
    const gitHooksDir = join(
      HookInstaller.gitDir(),
      'hooks'
    )

    if (existsSync(gitHooksDir)) {

      const hookFiles = readdirSync(gitHooksDir)

      for (const entry of hookFiles) {

        if (!entry.endsWith('.sample')) {

          conflicts.push(`.git/hooks/${entry}`)

        }

      }

    }

    if (existsSync(join(
      HookInstaller.repositoryRoot(),
      '.husky'
    ))) {

      conflicts.push('.husky/')

    }

    return conflicts

  }

  private static dispatcherScript (hookName: string): string {

    const result = `#!/bin/sh
for f in "$(dirname "$0")/${hookName}-"*; do [ -x "$f" ] && "$f" "$@" || exit 1; done
`
    return result

  }

  private static gitDir (): string {

    const result = ExecCliTool.run(
      'git',
      HookInstaller.toArgumentList(
        'rev-parse',
        '--git-dir'
      )
    )
    return result

  }

  private static installBundledChecks (hooksDir: string): void {

    const checkEntries = Object.entries(CHECK_SCRIPTS)

    for (const [
      checkName,
      content
    ] of checkEntries) {

      AtomicWrite.writeExecutableFile(
        join(
          hooksDir,
          checkName
        ),
        content
      )

    }

  }

  private static repositoryRoot (): string {

    const result = ExecCliTool.run(
      'git',
      HookInstaller.toArgumentList(
        'rev-parse',
        '--show-toplevel'
      )
    )
    return result

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
