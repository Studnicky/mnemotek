import {renameSync, writeFileSync} from 'node:fs'
import process from 'node:process'

export class AtomicWrite {

  public static write (target: string, content: string): void {

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
