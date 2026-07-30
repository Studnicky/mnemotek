import {existsSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

export class LockFile {

  private static readonly LOCK_FILE_NAME = 'config-standards-tool.lock'

  public static withLock<T> (root: string, callback: () => T): T {

    LockFile.acquireLock(root)

    try {

      return callback()

    } finally {

      LockFile.releaseLock(root)

    }

  }

  private static acquireLock (root: string): void {

    const path = LockFile.lockFilePath(root)

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

      throw new Error(`config-standards-tool is already running against this root (lock file ${path} exists). Wait for it to finish, or remove the lock file if a prior run crashed without cleaning up.`)

    }

    writeFileSync(
      path,
      String(process.pid),
      {flag: 'wx'}
    )

  }

  private static isErrorWithCode (error: unknown, code: string): boolean {

    return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === code

  }

  private static lockFilePath (root: string): string {

    const result = join(
      root,
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

  private static releaseLock (root: string): void {

    const path = LockFile.lockFilePath(root)

    if (existsSync(path)) {

      unlinkSync(path)

    }

  }

}
