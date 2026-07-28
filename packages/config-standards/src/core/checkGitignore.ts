import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import {REQUIRED_GITIGNORE_LINES} from './rules.js'

export interface GitignoreCheckResult {
  readonly [key: string]: unknown
  readonly missing: readonly string[]
  readonly ok: boolean
}

export function checkGitignore (root: string): GitignoreCheckResult {

  const filePath = join(root, '.gitignore')

  if (!existsSync(filePath)) {

    return {missing: [...REQUIRED_GITIGNORE_LINES], ok: false}

  }

  const lines = new Set(
    readFileSync(filePath, 'utf8').
      split('\n').
      map((line) => line.trim())
  )

  const missing = REQUIRED_GITIGNORE_LINES.filter((line) => !lines.has(line))

  return {missing, ok: missing.length === 0}

}
