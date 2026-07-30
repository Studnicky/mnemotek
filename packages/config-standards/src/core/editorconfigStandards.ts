import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {EditorconfigFixResultEntity, StandardsCheckResultEntity} from '../entities/index.js'

import {AtomicWrite} from './atomicWrite.js'
import {REQUIRED_EDITORCONFIG_LINES} from './constants/ConfigStandardsConstants.js'

export class EditorconfigStandards {

  public static check (root: string): StandardsCheckResultEntity.Type {

    const filePath = EditorconfigStandards.editorconfigPath(root)

    if (!existsSync(filePath)) {

      return {missing: [...REQUIRED_EDITORCONFIG_LINES],
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

    const missing = REQUIRED_EDITORCONFIG_LINES.filter((line) => {

      return !lines.has(line)

    })

    return {missing,
      ok: missing.length === 0}

  }

  public static fix (root: string): EditorconfigFixResultEntity.Type {

    const {missing} = EditorconfigStandards.check(root)

    if (missing.length === 0) {

      return {added: []}

    }

    const filePath = EditorconfigStandards.editorconfigPath(root)
    const addition = `${missing.join('\n')}\n`

    if (!existsSync(filePath)) {

      AtomicWrite.write(
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

    AtomicWrite.write(
      filePath,
      `${existing}${needsLeadingNewline
        ? '\n'
        : ''}${addition}`
    )

    return {added: missing}

  }

  private static editorconfigPath (root: string): string {

    const result = join(
      root,
      '.editorconfig'
    )
    return result

  }

}
