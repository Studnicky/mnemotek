import {renameSync, writeFileSync} from 'node:fs'
import process from 'node:process'

export class AtomicWrite {

  public static write (path: string, content: string): void {

    const temporaryPath = `${path}.tmp-${String(process.pid)}`

    writeFileSync(
      temporaryPath,
      content
    )
    renameSync(
      temporaryPath,
      path
    )

  }

}
