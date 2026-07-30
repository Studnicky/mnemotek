import {existsSync, readFileSync} from 'node:fs'

import type {MemoriaDoctorCheckResultEntity} from '../../entities/index.js'

import {DOCTOR_CHECK_PATTERNS} from './constants/DoctorCheckPatternsConstants.js'

/** Flags duplicate alias definitions with different bodies and PATH-append lines lacking a dedupe guard. */
export class RcHygieneCheck {

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
      findings.push(...RcHygieneCheck.findDuplicateAliases(
        rcPath,
        content
      ))
      findings.push(...RcHygieneCheck.findUnguardedPathAssignments(
        rcPath,
        content
      ))

    }

    return {check: 'rc-hygiene',
      findings,
      ok: findings.length === 0}

  }

  private static findDuplicateAliases (rcPath: string, content: string): string[] {

    const findings: string[] = []
    const aliasBodies = new Map<string, string>()

    for (const line of content.split('\n')) {

      const aliasMatch = DOCTOR_CHECK_PATTERNS.ALIAS_LINE.exec(line)
      const name = aliasMatch?.[1]
      const body = aliasMatch?.[2]

      if (name === undefined || body === undefined) {

        continue

      }

      const previousBody = aliasBodies.get(name)

      if (previousBody !== undefined && previousBody !== body) {

        findings.push(`${rcPath}: duplicate alias "${name}" redefined with a different body.`)

      }

      aliasBodies.set(
        name,
        body
      )

    }

    return findings

  }

  private static findUnguardedPathAssignments (rcPath: string, content: string): string[] {

    const findings: string[] = []
    const hasGuard = DOCTOR_CHECK_PATTERNS.PATH_GUARD.test(content)

    for (const line of content.split('\n')) {

      if (DOCTOR_CHECK_PATTERNS.PATH_ASSIGNMENT.test(line) && !hasGuard) {

        findings.push(`${rcPath}: PATH assignment lacks a dedupe guard (case ":$PATH:" in / typeset -U path): "${line.trim()}"`)

      }

    }

    return findings

  }

}
