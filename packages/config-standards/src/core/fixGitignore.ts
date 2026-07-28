import {appendFileSync, existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

import {checkGitignore} from './checkGitignore.js'

export interface FixGitignoreResult {
  readonly [key: string]: unknown
  readonly added: readonly string[]
}

export function fixGitignore (root: string): FixGitignoreResult {

  const {missing} = checkGitignore(root)

  if (missing.length === 0) {

    return {added: []}

  }

  const filePath = join(root, '.gitignore')
  const addition = `${missing.join('\n')}\n`

  if (!existsSync(filePath)) {

    writeFileSync(filePath, addition)
    return {added: missing}

  }

  const existing = readFileSync(filePath, 'utf8')
  const needsLeadingNewline = existing.length > 0 && !existing.endsWith('\n')

  appendFileSync(filePath, `${needsLeadingNewline ? '\n' : ''}${addition}`)

  return {added: missing}

}
