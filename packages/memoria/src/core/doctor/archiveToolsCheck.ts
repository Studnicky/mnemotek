import type {MemoriaDoctorCheckResultEntity} from '../../entities/index.js'

import {ExecCliTool} from '../execCliTool.js'

const ARCHIVE_TOOLS = [
  '7z',
  'tar',
  'unrar',
  'unzip',
  'zstd'
] as const

export class ArchiveToolsCheck {

  public static run (): MemoriaDoctorCheckResultEntity.Type {

    const findings = ARCHIVE_TOOLS.map((tool): string => {

      const found = ExecCliTool.run(
        'sh',
        ArchiveToolsCheck.toArgumentList(
          '-c',
          `command -v ${tool}`
        ),
        {allowFail: true}
      )
      const result = found.length > 0
        ? `${tool}: present (${found})`
        : `${tool}: missing`
      return result

    })

    return {check: 'archive-tools',
      findings,
      ok: true}

  }

  /** Variadic wrapper so an order-sensitive CLI argument list isn't a sortable array literal. */
  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
