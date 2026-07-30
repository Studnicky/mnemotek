import {existsSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

import {ExecCliTool} from './execCliTool.js'

export class LockFile {

  private static readonly LOCK_FILE_NAME = 'git-hooks-tool.lock'

  public static withLock<T> (callback: () => T): T {

    LockFile.acquireLock()

    try {

      return callback()

    } finally {

      LockFile.releaseLock()

    }

  }

  private static acquireLock (): void {

    const path = LockFile.lockFilePath()

    try {

      writeFileSync(
        path,
        String(process.pid),
        {flag: 'wx'}
      )
      return

    } catch (error: unknown) {

      if (!LockFile.isErrorWithCode(
        error,
        'EEXIST'
      )) {

        throw error

      }

    }

    if (!LockFile.reclaimStaleLock(path)) {

      throw new Error(`git-hooks-tool is already running in this repository (lock file ${path} exists). Wait for it to finish, or remove the lock file if a prior run crashed without cleaning up.`)

    }

    writeFileSync(
      path,
      String(process.pid),
      {flag: 'wx'}
    )

  }

  private static gitDir (): string {

    const result = ExecCliTool.run(
      'git',
      LockFile.toArgumentList(
        'rev-parse',
        '--git-dir'
      )
    )
    return result

  }

  private static isErrorWithCode (error: unknown, code: string): boolean {

    return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === code

  }

  private static lockFilePath (): string {

    const result = join(
      LockFile.gitDir(),
      LockFile.LOCK_FILE_NAME
    )
    return result

  }

  private static reclaimStaleLock (path: string): boolean {

    const pid = Number(readFileSync(
      path,
      'utf8'
    ).trim())

    if (!Number.isInteger(pid)) {

      return false

    }

    try {

      process.kill(
        pid,
        0
      )
      return false

    } catch (error: unknown) {

      if (!LockFile.isErrorWithCode(
        error,
        'ESRCH'
      )) {

        return false

      }

      unlinkSync(path)
      return true

    }

  }

  private static releaseLock (): void {

    const path = LockFile.lockFilePath()

    if (existsSync(path)) {

      unlinkSync(path)

    }

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
