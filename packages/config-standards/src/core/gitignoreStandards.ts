import {appendFileSync, existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

import type {GitignoreFixResultEntity, StandardsCheckResultEntity} from '../entities/index.js'

import {REQUIRED_GITIGNORE_LINES} from './constants/ConfigStandardsConstants.js'

export class GitignoreStandards {

  public static check (root: string): StandardsCheckResultEntity.Type {

    const filePath = GitignoreStandards.gitignorePath(root)

    if (!existsSync(filePath)) {

      return {missing: [...REQUIRED_GITIGNORE_LINES],
        ok: false}

    }

    const lines = new Set(readFileSync(
      filePath,
      'utf8'
    ).
      split('\n').
      map((line) => {

        const result = line.trim(); return result

      }))

    const missing = REQUIRED_GITIGNORE_LINES.filter((line) => {

      return !lines.has(line)

    })

    return {missing,
      ok: missing.length === 0}

  }

  public static fix (root: string): GitignoreFixResultEntity.Type {

    const {missing} = GitignoreStandards.check(root)

    if (missing.length === 0) {

      return {added: []}

    }

    const filePath = GitignoreStandards.gitignorePath(root)
    const addition = `${missing.join('\n')}\n`

    if (!existsSync(filePath)) {

      writeFileSync(
        filePath,
        addition
      )
      return {added: missing}

    }

    const existing = readFileSync(
      filePath,
      'utf8'
    )
    const needsLeadingNewline = existing.length > 0 && !existing.endsWith('\n')

    appendFileSync(
      filePath,
      `${needsLeadingNewline
        ? '\n'
        : ''}${addition}`
    )

    return {added: missing}

  }

  private static gitignorePath (root: string): string {

    const result = join(
      root,
      '.gitignore'
    )
    return result

  }

}
