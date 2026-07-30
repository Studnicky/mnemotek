import {renameSync, writeFileSync} from 'node:fs'
import process from 'node:process'

export class AtomicWrite {

  public static writeExecutableFile (target: string, content: string): void {

    const temporaryPath = `${target}.tmp-${String(process.pid)}`

    writeFileSync(
      temporaryPath,
      content,
      {mode: 0o755}
    )
    renameSync(
      temporaryPath,
      target
    )

  }

}
