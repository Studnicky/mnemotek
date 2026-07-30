import {existsSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import process from 'node:process'

/** Exclusive-create lock file with stale-pid reclaim, parameterized by an explicit path. */
export class LockFile {

  public static acquire (path: string): void {

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

      throw new Error(`memoria is already running against this manifest (lock file ${path} exists). Wait for it to finish, or remove the lock file if a prior run crashed without cleaning up.`)

    }

    writeFileSync(
      path,
      String(process.pid),
      {flag: 'wx'}
    )

  }

  public static release (path: string): void {

    if (existsSync(path)) {

      unlinkSync(path)

    }

  }

  public static withLock<T> (path: string, callback: () => T): T {

    LockFile.acquire(path)

    try {

      return callback()

    } finally {

      LockFile.release(path)

    }

  }

  private static isErrorWithCode (error: unknown, code: string): boolean {

    return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === code

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

}
