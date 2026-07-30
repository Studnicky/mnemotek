import {renameSync, writeFileSync} from 'node:fs'
import process from 'node:process'

/** Writes full content to a pid-scoped temp path, then atomically renames it over the target. */
export class AtomicWrite {

  public static write (target: string, content: string | Uint8Array): void {

    const temporaryPath = `${target}.tmp-${String(process.pid)}`
    writeFileSync(
      temporaryPath,
      content
    )
    renameSync(
      temporaryPath,
      target
    )

  }

}
