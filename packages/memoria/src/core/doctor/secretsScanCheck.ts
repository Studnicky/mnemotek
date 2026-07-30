import {existsSync, readFileSync} from 'node:fs'

import type {MemoriaDoctorCheckResultEntity} from '../../entities/index.js'

import {DOCTOR_CHECK_PATTERNS} from './constants/DoctorCheckPatternsConstants.js'

/**
 * Built-in regex scan only, unconditionally — this repo's `redactor` package
 * strips ANSI/spinner noise from command output for token savings and has no
 * secret-detection capability, so there is no stronger tool to shell out to.
 * Coverage is limited to common patterns.
 */
export class SecretsScanCheck {

  public static run (rcPaths: readonly string[]): MemoriaDoctorCheckResultEntity.Type {

    const findings: string[] = []

    for (const rcPath of rcPaths) {

      if (!existsSync(rcPath)) {

        continue

      }

      const content = readFileSync(
        rcPath,
        'utf8'
      )

      for (const match of content.matchAll(DOCTOR_CHECK_PATTERNS.SECRET_EXPORT)) {

        const name = match[1]
        const value = match[2]?.trim() ?? ''
        const looksLikeReference = value.length === 0 || DOCTOR_CHECK_PATTERNS.VARIABLE_REFERENCE.test(value)

        if (!looksLikeReference) {

          findings.push(`${rcPath}: possible literal secret export "${String(name)}" (built-in regex scan — coverage is limited to common patterns).`)

        }

      }

    }

    return {check: 'secrets-scan',
      findings,
      ok: findings.length === 0}

  }

}
