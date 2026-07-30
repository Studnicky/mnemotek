import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {MemoriaDoctorCheckResultEntity} from '../../entities/index.js'

import {ExecCliTool} from '../execCliTool.js'

export class EnvrcAuditCheck {

  public static run (homeRoot: string): MemoriaDoctorCheckResultEntity.Type {

    const findings: string[] = []
    const direnvPath = ExecCliTool.run(
      'sh',
      EnvrcAuditCheck.toArgumentList(
        '-c',
        'command -v direnv'
      ),
      {allowFail: true}
    )

    if (direnvPath.length > 0) {

      const status = ExecCliTool.run(
        'direnv',
        ['status'],
        {allowFail: true}
      )
      findings.push(status.length > 0
        ? `direnv status: ${status}`
        : 'direnv is installed but "direnv status" produced no output.')

    } else {

      findings.push('direnv is not installed on PATH; envrc audit is limited to static .envrc inspection.')

    }

    const envrcPath = join(
      homeRoot,
      '.envrc'
    )

    if (existsSync(envrcPath)) {

      const content = readFileSync(
        envrcPath,
        'utf8'
      )

      if (content.includes('source_up')) {

        findings.push(`${envrcPath} uses "source_up" (loads a parent .envrc — verify this is intentional).`)

      }

    }

    return {check: 'envrc-audit',
      findings,
      ok: true}

  }

  /** Variadic wrapper so an order-sensitive CLI argument list isn't a sortable array literal. */
  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
